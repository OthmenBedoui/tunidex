import { z } from 'zod';
import { uuidSchema } from './common.js';

export const notificationIdParamsSchema = z.object({
  id: uuidSchema
}).strict();

export const legacyNotificationIdParamsSchema = z.object({
  notificationId: uuidSchema
}).strict();
