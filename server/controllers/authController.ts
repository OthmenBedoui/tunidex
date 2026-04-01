
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-g2g-tunisie';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalide' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  const u = { ...user } as { password?: string };
  delete u.password;
  res.json({ token, user: u });
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
  if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ error: 'Email pris' });
  const user = await prisma.user.create({ data: { email, password: await bcrypt.hash(password, 10), username, role: 'USER', avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` }});
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  const u = { ...user } as { password?: string };
  delete u.password;
  res.json({ token, user: u });
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
export const getMe = async (req: Request & { user?: { id: string; role: string } }, res: Response) => {
  if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
  const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const u = { ...user } as { password?: string };
  delete u.password;
  res.json(u);
};
