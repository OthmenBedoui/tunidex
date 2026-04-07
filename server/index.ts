
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { seedDatabase } from './utils/seeder.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path === '/api/config') {
      console.log(`[http] ${req.method} ${req.path} content-length=${req.headers['content-length'] || 'unknown'}`);
    }
    next();
  });
  app.use(express.json({ limit: '10mb' }));

  // Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', productRoutes); // listings, categories
  app.use('/api', cartRoutes);    // cart, checkout, orders
  app.use('/api', adminRoutes);   // admin stats, users
  app.use('/api', aiRoutes);

  app.use((error: Error & { type?: string; status?: number }, req: Request, res: Response, next: NextFunction) => {
    if (error?.type === 'entity.too.large') {
      console.error(`[http] payload too large method=${req.method} path=${req.path} limit=10mb`);
      return res.status(413).json({ error: 'Payload too large. Reduce the image size and try again.' });
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
