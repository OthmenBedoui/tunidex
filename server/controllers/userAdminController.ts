import type { Request, Response } from 'express';
import { sendClientSystemNotification, getUsersForAdmin, updateAdminUserBalance, updateAdminUserRole } from '../services/adminUserService.js';
import type { AdminRequest } from '../services/adminSharedService.js';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get paginated users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [GUEST, USER, AGENT, ADMIN]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, email-asc, email-desc, balance-desc, balance-asc]
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsersResponse'
 */
export const getAllUsers = async (req: Request, res: Response) => {
  res.json(await getUsersForAdmin(req.query));
};

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User role updated
 */
export const updateUserRole = async (req: Request, res: Response) => {
  res.json(await updateAdminUserRole(req.params.id, req.body.role));
};

export const updateUserBalance = async (req: Request, res: Response) => {
  res.json(await updateAdminUserBalance(req.params.id, req.body.balance));
};

export const sendClientNotification = async (req: AdminRequest, res: Response) => {
  res.status(201).json(await sendClientSystemNotification({
    title: req.body?.title,
    message: req.body?.message,
    targetUserIds: req.body?.targetUserIds,
    actorId: req.user?.id
  }));
};
