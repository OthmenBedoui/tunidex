import { NotificationAudience, NotificationType, Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { STAFF_ROLES } from '../constants/roles.js';
import logger from '../logger.js';

type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  orderId?: string | null;
  dedupeKey?: string | null;
};

type NotifyUserParams = NotificationPayload & {
  userId: string;
};

type NotifyStaffParams = NotificationPayload & {
  targetTab?: string | null;
};

const buildNotificationData = (
  audience: NotificationAudience,
  recipientId: string,
  params: NotificationPayload & { targetTab?: string | null }
) => ({
  recipientId,
  audience,
  type: params.type,
  title: params.title,
  message: params.message,
  metadata: params.metadata,
  orderId: params.orderId || null,
  targetTab: params.targetTab || null,
  dedupeKey: params.dedupeKey || null
});

export const notifyUser = async (params: NotifyUserParams) => {
  try {
    if (params.dedupeKey) {
      return await prisma.notification.upsert({
        where: {
          recipientId_dedupeKey: {
            recipientId: params.userId,
            dedupeKey: params.dedupeKey
          }
        },
        create: buildNotificationData('CLIENT', params.userId, params),
        update: {}
      });
    }

    return await prisma.notification.create({
      data: buildNotificationData('CLIENT', params.userId, params)
    });
  } catch (error) {
    logger.error({
      userId: params.userId,
      type: params.type,
      orderId: params.orderId || null,
      dedupeKey: params.dedupeKey || null,
      err: error
    }, 'notification_notify_user_failed');
    throw error;
  }
};

export const notifyStaff = async (params: NotifyStaffParams) => {
  try {
    const staffUsers = await prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] } },
      select: { id: true }
    });

    if (staffUsers.length === 0) {
      return { count: 0 };
    }

    const result = await prisma.notification.createMany({
      data: staffUsers.map((user) => buildNotificationData('ADMIN', user.id, params)),
      skipDuplicates: true
    });

    return { count: result.count };
  } catch (error) {
    logger.error({
      type: params.type,
      orderId: params.orderId || null,
      targetTab: params.targetTab || null,
      dedupeKey: params.dedupeKey || null,
      err: error
    }, 'notification_notify_staff_failed');
    throw error;
  }
};
