import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-g2g-tunisie';

export const authenticate = (req: Request & { user?: { id: string, role: string } }, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { id: string, role: string };
    req.user = decoded;
    next();
  } catch { return res.status(403).json({ error: 'Invalid token' }); }
};

export const isAdmin = (req: Request & { user?: { role: string } }, res: Response, next: NextFunction) => { 
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' }); 
    next(); 
};

export const isStaff = (req: Request & { user?: { role: string } }, res: Response, next: NextFunction) => { 
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'AGENT') return res.status(403).json({ error: 'Staff only' }); 
    next(); 
};