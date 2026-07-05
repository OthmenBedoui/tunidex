import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyNotifications, getUnreadCount, markAllRead, markRead } from '../controllers/notificationController.js';
import { legacyNotificationIdParamsSchema, notificationIdParamsSchema } from '../validation/notificationSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();

router.get('/notifications', authenticate, getMyNotifications);
router.get('/notifications/unread-count', authenticate, getUnreadCount);
router.patch('/notifications/:id/read', authenticate, validate({ params: notificationIdParamsSchema }), markRead);
router.post('/notifications/read-all', authenticate, markAllRead);
router.get('/users/me/notifications', authenticate, getMyNotifications);
router.post('/users/me/notifications/read-all', authenticate, markAllRead);
router.patch('/users/me/notifications/:notificationId/read', authenticate, validate({ params: legacyNotificationIdParamsSchema }), markRead);

export default router;
