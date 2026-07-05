import type { Request, Response } from 'express';
import { getDashboardStats } from '../services/adminStatsService.js';

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Administrative functions
 *   - name: Users
 *     description: User management
 *   - name: Config
 *     description: Site configuration
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard statistics
 */
export const getStats = async (_req: Request, res: Response) => {
  res.json(await getDashboardStats());
};
