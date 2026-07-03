
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { seedDatabase } from './utils/seeder.js';
import prisma from './prisma.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Trust the reverse proxy so req.protocol and client IPs stay correct behind Nginx.
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path === '/api/config') {
      console.log(`[http] ${req.method} ${req.path} content-length=${req.headers['content-length'] || 'unknown'}`);
    }
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', productRoutes); // listings, categories
  app.use('/api', cartRoutes);    // cart, checkout, orders
  app.use('/api', adminRoutes);   // admin stats, users
  app.use('/api', aiRoutes);

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
    const [categories, listings] = await Promise.all([
      prisma.category.findMany({ select: { slug: true } }),
      prisma.listing.findMany({ where: { isArchived: false }, select: { slug: true, updatedAt: true } })
    ]);
    const urls = [
      { loc: `${baseUrl}/`, lastmod: new Date().toISOString() },
      ...categories.map((category) => ({ loc: `${baseUrl}/category/${encodeURIComponent(category.slug)}`, lastmod: new Date().toISOString() })),
      ...listings.map((listing) => ({ loc: `${baseUrl}/product/${encodeURIComponent(listing.slug)}`, lastmod: listing.updatedAt.toISOString() }))
    ];

    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}\n</urlset>`);
  });

  app.use((error: Error & { type?: string; status?: number }, req: Request, res: Response, next: NextFunction) => {
    if (error?.type === 'entity.too.large') {
      console.error(`[http] payload too large method=${req.method} path=${req.path} limit=25mb`);
      return res.status(413).json({ error: 'Payload too large. Reduce the file or image size and try again.' });
    }

    if (error) {
      console.error(`[http] unhandled error method=${req.method} path=${req.path}`, error);
      return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
    }

    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => { 
    console.log(`🚀 Serveur: http://localhost:${PORT}`); 
    console.log(`📄 Swagger Docs: http://localhost:${PORT}/api-docs`);
    await seedDatabase(); 
  });
}

startServer();
