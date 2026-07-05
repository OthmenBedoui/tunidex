import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../services/authTokenService.js';
import { isStaffRole } from '../constants/roles.js';

export const authenticate = (req: Request & { user?: { id: string, role: string } }, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Access token expired.' });
    return res.status(401).json({ error: 'Invalid access token.' });
  }
};

export const optionalAuthenticate = (req: Request & { user?: { id: string, role: string } }, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    req.user = decoded;
  } catch {
    // Public routes keep working; protected routes still use authenticate.
  }
  next();
};

export const isAdmin = (req: Request & { user?: { role: string } }, res: Response, next: NextFunction) => { 
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' }); 
    next(); 
};

export const isStaff = (req: Request & { user?: { role: string } }, res: Response, next: NextFunction) => { 
    if (!isStaffRole(req.user?.role)) return res.status(403).json({ error: 'Staff only' }); 
    next(); 
};
