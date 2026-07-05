import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import env from './env.js';

const buildRateLimitHandler = (message: string) =>
  (_req: Request, res: Response) => {
    res.status(429).json({
      error: message
    });
  };

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

const allowedOrigins = new Set(env.allowedOrigins.map(normalizeOrigin));

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: env.isProduction
        ? ["'self'", "'unsafe-inline'"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: env.isProduction
        ? ["'self'", 'https:', 'wss:']
        : ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

export const globalApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many API requests. Please try again in a few minutes.')
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many authentication attempts. Please wait 15 minutes before trying again.')
});

export const guestCheckoutRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many checkout attempts. Please wait before trying again.')
});

export const defaultJsonParser = express.json({ limit: '2mb' });
export const defaultUrlencodedParser = express.urlencoded({ extended: true, limit: '2mb' });
