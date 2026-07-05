import 'express';
import type pino from 'pino';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log?: pino.Logger;
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export {};
