import type { Request, Response } from 'express';
import prisma from '../prisma.js';

type AuthRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

const serializeNotification = (notification: {
  id: string;
  recipientId: string;
  orderId: string | null;
  type: string;
  title: string;
  message: string;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
  targetTab?: string | null;
  audience?: string;
  order?: { orderNumber: string; status: string } | null;
}) => ({
  id: notification.id,
  userId: notification.recipientId,
  orderId: notification.orderId,
  orderNumber: notification.order?.orderNumber || null,
  orderStatus: notification.order?.status || null,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  metadata: notification.metadata as Record<string, unknown> | null,
  targetTab: notification.targetTab || null,
  audience: notification.audience || null,
  read: Boolean(notification.readAt),
  readAt: notification.readAt?.toISOString() || null,
  createdAt: notification.createdAt.toISOString(),
  updatedAt: notification.createdAt.toISOString()
});

const getNotificationIdParam = (req: Request) => req.params.id || req.params.notificationId;

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get current user notifications
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *     responses:
 *       200:
 *         description: User notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 200)
    : 50;

  const notifications = await prisma.notification.findMany({
    where: { recipientId: req.user?.id },
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  res.json(notifications.map(serializeNotification));
};

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get current user unread notification count
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: {
      recipientId: req.user?.id,
      readAt: null
    }
  });

  res.json({ count });
};

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated notification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification not found
 */
export const markRead = async (req: AuthRequest, res: Response) => {
  const notificationId = getNotificationIdParam(req);
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId: req.user?.id,
      readAt: null
    },
    data: {
      readAt: now
    }
  });

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: req.user?.id
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true
        }
      }
    }
  });

  if (!notification) {
    return res.status(404).json({ error: 'Notification introuvable.' });
  }

  if (result.count === 0 && notification.readAt === null) {
    return res.status(404).json({ error: 'Notification introuvable.' });
  }

  res.json(serializeNotification(notification));
};

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all current user notifications as read
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of updated notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: integer
 */
export const markAllRead = async (req: AuthRequest, res: Response) => {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: req.user?.id,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  res.json({ updated: result.count, success: true });
};
