import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import logger from '../logger.js';

type AuthenticatedRequest = Request & {
  user?: { id?: string; role?: string };
  requestId?: string;
  log?: typeof logger;
};

export const requestLoggingMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();
  const requestId = req.headers['x-request-id']?.toString() || crypto.randomUUID();
  const requestLogger = logger.child({
    requestId,
    method: req.method,
    path: req.path
  });

  req.requestId = requestId;
  req.log = requestLogger;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const logPayload = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.id || null
    };

    if (res.statusCode >= 500) {
      requestLogger.error({
        ...logPayload,
        reason: res.locals.errorReason || res.statusMessage || 'Internal server error'
      }, 'request_completed');
      return;
    }

    if (res.statusCode >= 400) {
      requestLogger.warn({
        ...logPayload,
        reason: res.locals.errorReason || res.statusMessage || 'Client error'
      }, 'request_completed');
      return;
    }

    requestLogger.info(logPayload, 'request_completed');
  });

  next();
};
