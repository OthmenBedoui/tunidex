import express from 'express';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import env from './config/env.js';
import {
  authRateLimit,
  corsMiddleware,
  defaultJsonParser,
  defaultUrlencodedParser,
  globalApiRateLimit,
  guestCheckoutRateLimit,
  helmetMiddleware
} from './config/httpSecurity.js';
import prisma from './prisma.js';
import logger from './logger.js';
import { captureServerException } from './monitoring.js';
import { requestLoggingMiddleware } from './middleware/requestLogging.js';
import { getHealthStatus } from './health.js';
import authRoutes from './routes/authRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { startEmailOutboxWorker } from './services/emailService.js';
import { startPaymentReviewReminderWorker } from './services/paymentReviewReminderService.js';

export async function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestLoggingMiddleware);
  app.use(corsMiddleware);
  app.use(helmetMiddleware);
  app.use('/uploads', express.static(env.uploadsDir, {
    immutable: true,
    maxAge: '1y',
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));
  app.use('/api', globalApiRateLimit);
  app.use(
    [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/register/verify-otp',
      '/api/auth/register/resend-otp',
      '/api/auth/verify-email'
    ],
    authRateLimit
  );
  app.use('/api/checkout/guest', guestCheckoutRateLimit);
  app.use('/api/checkout/confirm', guestCheckoutRateLimit);
  app.use(defaultJsonParser);
  app.use(defaultUrlencodedParser);

  app.get('/health', async (_req, res, next) => {
    try {
      res.json(await getHealthStatus());
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/runtime-config', (_req, res) => {
    res.json({
      sentryDsn: env.sentryDsn || ''
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api', blogRoutes);
  app.use('/api', productRoutes);
  app.use('/api', notificationRoutes);
  app.use('/api', cartRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', aiRoutes);
  app.use('/api', (_req, res) => {
    res.locals.errorReason = 'API route not found';
    res.status(404).json({ error: 'API route not found.' });
  });

  app.get('/robots.txt', async (_req, res) => {
    const record = await prisma.siteConfig.findUnique({ where: { key: 'site' } });
    const config = record?.data as { seoRobots?: string; seoSitemapEnabled?: boolean; seoCanonicalUrl?: string } | undefined;
    const disallowAll = config?.seoRobots?.includes('noindex');
    const baseUrl = (config?.seoCanonicalUrl || '').replace(/\/$/, '');
    res.type('text/plain').send([
      'User-agent: *',
      disallowAll ? 'Disallow: /' : 'Allow: /',
      config?.seoSitemapEnabled !== false && baseUrl ? `Sitemap: ${baseUrl}/sitemap.xml` : ''
    ].filter(Boolean).join('\n'));
  });

  app.get('/sitemap.xml', async (req, res) => {
    const record = await prisma.siteConfig.findUnique({ where: { key: 'site' } });
    const config = record?.data as { seoCanonicalUrl?: string; seoSitemapEnabled?: boolean } | undefined;
    if (config?.seoSitemapEnabled === false) return res.status(404).send('Sitemap disabled');

    const baseUrl = (config?.seoCanonicalUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const [categories, listings, blogPosts] = await Promise.all([
      prisma.category.findMany({ select: { slug: true } }),
      prisma.listing.findMany({ where: { isArchived: false }, select: { slug: true, updatedAt: true } }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true }
      })
    ]);
    const urls = [
      { loc: `${baseUrl}/`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/about`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/contact`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/cgv`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/remboursement`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/comment-ca-marche`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/faq`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/blog`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/privacy-policy`, lastmod: new Date().toISOString() },
      { loc: `${baseUrl}/terms`, lastmod: new Date().toISOString() },
      ...categories.map((category) => ({ loc: `${baseUrl}/category/${encodeURIComponent(category.slug)}`, lastmod: new Date().toISOString() })),
      ...listings.map((listing) => ({ loc: `${baseUrl}/product/${encodeURIComponent(listing.slug)}`, lastmod: listing.updatedAt.toISOString() })),
      ...blogPosts.map((post) => ({ loc: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`, lastmod: post.updatedAt.toISOString() }))
    ];

    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}\n</urlset>`);
  });

  app.use((error: Error & { type?: string; status?: number }, req: Request, res: Response, next: NextFunction) => {
    if (error?.message?.startsWith('Origin not allowed by CORS:')) {
      res.locals.errorReason = 'Origin not allowed by CORS.';
      req.log?.warn({ requestId: req.requestId, method: req.method, path: req.path, reason: res.locals.errorReason }, 'request_error');
      return res.status(403).json({ error: 'Origin not allowed by CORS.' });
    }

    if (error?.type === 'entity.too.large') {
      res.locals.errorReason = 'Payload too large. Maximum allowed size is 2mb.';
      req.log?.warn({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        reason: res.locals.errorReason
      }, 'request_error');
      return res.status(413).json({ error: 'Payload too large. Maximum allowed size is 2mb.' });
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.locals.errorReason = 'Uploaded image is too large. Maximum allowed size is 10mb.';
      req.log?.warn({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        reason: res.locals.errorReason
      }, 'request_error');
      return res.status(413).json({ error: 'Uploaded image is too large. Maximum allowed size is 10mb.' });
    }

    if (error) {
      const statusCode = error.status || 500;
      const reason = error.message || 'Internal server error';
      res.locals.errorReason = reason;

      if (statusCode >= 500) {
        req.log?.error({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          reason,
          err: error
        }, 'request_error');
        void captureServerException(error, {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          userId: req.user?.id || null
        });
      } else {
        req.log?.warn({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          reason
        }, 'request_error');
      }

      return res.status(statusCode).json({ error: reason });
    }

    next();
  });

  if (env.nodeEnv === 'development') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (env.isProduction) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer(port = env.port) {
  const app = await createApp();
  return app.listen(port, '0.0.0.0', () => {
    startEmailOutboxWorker();
    startPaymentReviewReminderWorker();
    logger.info({
      port,
      url: `http://localhost:${port}`,
      docsUrl: `http://localhost:${port}/api-docs`
    }, 'server_started');
  });
}
