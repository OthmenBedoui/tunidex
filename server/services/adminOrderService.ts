import prisma from '../prisma.js';
import { resendOrderConfirmationEmail, sendDeliveryEmail, sendOrderStatusUpdateEmail, sendPaymentApprovedEmail, sendPaymentRejectedEmail } from './orderEmailService.js';
import { encryptDeliveryContent, decryptDeliveryContent } from './deliverySecurityService.js';
import { getOrderStatusNotificationContent, notifyClientOrderStatus } from './clientNotificationService.js';
import { notifyUser } from './notificationService.js';
import { getActor, requestMeta, serializeAdminOrder, type AdminRequest } from './adminSharedService.js';
import { HttpError } from './httpError.js';
import { buildNextCursor, resolvePagination, type PaginationQuery } from '../utils/pagination.js';
import { sendWhatsappWebhookEvent } from './whatsappBotService.js';
import { awardDeliveryLoyaltyPoints } from './loyaltyService.js';
import logger from '../logger.js';

const logNotificationFailure = (event: string, error: unknown, details: Record<string, unknown>) => {
  logger.error({ event, ...details, err: error }, 'notification_event_failed');
};

const adminOrderInclude = {
  items: true,
  invoice: true,
  payments: true,
  deliveries: true,
  actionLogs: { orderBy: { createdAt: 'asc' as const } },
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true
    }
  }
};

const approvalOrderInclude = {
  ...adminOrderInclude,
  items: {
    include: {
      listing: {
        select: {
          id: true,
          isInstant: true
        }
      }
    }
  }
};

const isPaidPaymentStatus = (status: string) => ['PAID', 'APPROVED'].includes(status);
const isReviewableOrderStatus = (status: string) => ['PAYMENT_UNDER_REVIEW', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED', 'PAID'].includes(status);

const buildWhatsAppOrderMessage = (order: {
  orderNumber: string;
  paymentMethod?: string | null;
  customerPhone?: string | null;
}, customMessage?: string) => {
  const phoneDigits = (order.customerPhone || '').replace(/\D/g, '');
  const message = customMessage || `Commande ${order.orderNumber} - paiement ${order.paymentMethod || 'manuel'}.`;
  return {
    phoneDigits,
    message,
    url: phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}` : null
  };
};

const notifyApprovedClient = async (order: {
  id: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  userId?: string | null;
}) => {
  if (!order.userId) return;

  try {
    await notifyUser({
      userId: order.userId,
      type: 'PAYMENT_APPROVED',
      title: order.status === 'DELIVERED' ? 'Paiement approuve et commande livree' : 'Paiement approuve',
      message:
        order.status === 'DELIVERED'
          ? `Le paiement de votre commande ${order.orderNumber} a ete approuve et la livraison est disponible.`
          : `Le paiement de votre commande ${order.orderNumber} a ete approuve.`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        amount: order.amount,
        currency: order.currency
      },
      orderId: order.id,
      dedupeKey: `PAYMENT_APPROVED:${order.id}`
    });
  } catch (error) {
    logNotificationFailure('PAYMENT_APPROVED', error, { orderId: order.id, userId: order.userId });
  }
};

const notifyRejectedClient = async (order: {
  id: string;
  orderNumber: string;
  status: string;
  userId?: string | null;
}, reason: string) => {
  if (!order.userId) return;

  try {
    await notifyUser({
      userId: order.userId,
      type: 'PAYMENT_REJECTED',
      title: 'Paiement rejete',
      message: `Le paiement de votre commande ${order.orderNumber} a ete rejete. Motif: ${reason}`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        reason
      },
      orderId: order.id,
      dedupeKey: `PAYMENT_REJECTED:${order.id}`
    });
  } catch (error) {
    logNotificationFailure('PAYMENT_REJECTED', error, { orderId: order.id, userId: order.userId });
  }
};

const notifyDeliveredClient = async (order: {
  id: string;
  orderNumber: string;
  status: string;
  userId?: string | null;
  deliveries?: Array<{ id: string }>;
}) => {
  if (!order.userId) return;

  try {
    await notifyUser({
      userId: order.userId,
      type: 'ORDER_DELIVERED',
      title: 'Commande livree',
      message: `Votre commande ${order.orderNumber} a ete livree.`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryCount: order.deliveries?.length || 0
      },
      orderId: order.id,
      dedupeKey: `ORDER_DELIVERED:${order.id}`
    });
  } catch (error) {
    logNotificationFailure('ORDER_DELIVERED', error, { orderId: order.id, userId: order.userId });
  }
};

export const getAdminOrders = async (query: PaginationQuery & {
  status?: string;
  q?: string;
  sort?: string;
}) => {
  const { page, limit, skip } = resolvePagination(query);
  const search = typeof query.q === 'string' ? query.q.trim() : '';

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' as const } },
            { customerEmail: { contains: search, mode: 'insensitive' as const } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { items: { some: { titleSnapshot: { contains: search, mode: 'insensitive' as const } } } }
          ]
        }
      : {})
  };

  const orderBy =
    query.sort === 'oldest'
      ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
      : query.sort === 'amount-desc'
        ? [{ amount: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }]
        : query.sort === 'amount-asc'
          ? [{ amount: 'asc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }]
          : [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: adminOrderInclude,
      orderBy,
      skip,
      take: limit
    }),
    prisma.order.count({ where })
  ]);

  return {
    items: orders.map(serializeAdminOrder),
    total,
    nextCursor: buildNextCursor(page, limit, total)
  };
};

export const resendAdminOrderInvoiceEmail = async (orderId: string, req: AdminRequest) => {
  const result = await resendOrderConfirmationEmail(orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: adminOrderInclude
  });

  if (!order) throw new HttpError(404, 'Commande introuvable.');

  await prisma.orderActionLog.create({
    data: {
      orderId: order.id,
      ...getActor(req),
      action: 'EMAIL_RESENT',
      ...requestMeta(req),
      metadata: { type: 'invoice', status: result.status }
    }
  });

  return { ...order, emailStatus: result.status, emailError: result.error };
};

export const updateAdminOrderStatus = async (orderId: string, status: string, req: AdminRequest) => {
  const previousOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true }
  });

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        paymentConfirmedAt: ['IN_PROGRESS', 'PAYMENT_RECEIVED', 'DELIVERED', 'COMPLETED'].includes(status) ? new Date() : undefined
      },
      include: adminOrderInclude
    });

    await tx.orderActionLog.create({
      data: {
        orderId: updated.id,
        ...getActor(req),
        action: 'ORDER_STATUS_UPDATED',
        ...requestMeta(req),
        metadata: { status }
      }
    });

    if (status === 'DELIVERED') {
      await awardDeliveryLoyaltyPoints(tx, {
        orderId: updated.id,
        userId: updated.userId,
        orderNumber: updated.orderNumber,
        totalAmount: updated.total || updated.amount
      });
    }

    return updated;
  });

  await notifyClientOrderStatus({ orderId: order.id, status: order.status, previousStatus: previousOrder?.status || null, force: true });
  const statusContent = getOrderStatusNotificationContent(order.orderNumber, order.status, previousOrder?.status || null);
  await sendOrderStatusUpdateEmail(order, order.status, statusContent.message);
  return serializeAdminOrder(order);
};

export const approveAdminOrderPayment = async (orderId: string, req: AdminRequest) => {
  const meta = requestMeta(req);
  const actor = getActor(req);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: approvalOrderInclude
    });

    if (!order) throw new HttpError(404, 'Commande introuvable.');

    const alreadyDelivered = order.status === 'DELIVERED' && order.deliveries.some((delivery) => delivery.status === 'SENT' || delivery.status === 'VIEWED');
    const alreadyPaid = order.payments.some((payment) => isPaidPaymentStatus(payment.status));
    if (alreadyDelivered || (alreadyPaid && order.status === 'PAID')) {
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: adminOrderInclude });
      return { order: current, previousStatus: order.status, autoDelivered: alreadyDelivered, idempotent: true };
    }

    if (!isReviewableOrderStatus(order.status)) {
      throw new HttpError(400, 'Cette commande ne peut plus etre approuvee.');
    }

    const allItemsInstant = order.items.length > 0 && order.items.every((item) => item.listing?.isInstant !== false);
    const readyDeliveries = order.deliveries.filter((delivery) => delivery.status === 'READY' || delivery.status === 'LOCKED');
    const autoDelivered = allItemsInstant && readyDeliveries.length > 0;
    const nextStatus = autoDelivered ? 'DELIVERED' : 'PAID';

    await tx.payment.updateMany({
      where: { orderId: order.id, status: { in: ['PENDING', 'SUBMITTED', 'APPROVED'] } },
      data: {
        status: 'PAID',
        approvedAt: now,
        reviewedBy: req.user?.id || null,
        paidAt: now,
        rejectionReason: null
      }
    });

    if (autoDelivered) {
      await tx.delivery.updateMany({
        where: { orderId: order.id, status: { in: ['READY', 'LOCKED'] } },
        data: { status: 'SENT', sentAt: now, sentBy: req.user?.id || null }
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paymentConfirmedAt: now,
        invoice: order.invoice ? { update: { status: 'PAID' } } : undefined
      }
    });

    await tx.orderActionLog.create({
      data: {
        orderId: order.id,
        ...actor,
        action: 'PAYMENT_APPROVED',
        ...meta,
        metadata: {
          reviewedBy: req.user?.id || null,
          autoDelivered,
          deliveryCount: autoDelivered ? readyDeliveries.length : 0
        }
      }
    });

    if (autoDelivered) {
      await tx.orderActionLog.create({
        data: {
          orderId: order.id,
          ...actor,
          action: 'DELIVERY_SENT',
          ...meta,
          metadata: { deliveryCount: readyDeliveries.length, automated: true }
        }
      });

      await awardDeliveryLoyaltyPoints(tx, {
        orderId: order.id,
        userId: order.userId,
        orderNumber: order.orderNumber,
        totalAmount: order.total || order.amount
      });
    }

    const updated = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: adminOrderInclude
    });

    return {
      order: updated,
      previousStatus: order.status,
      autoDelivered,
      idempotent: false
    };
  });

  await notifyApprovedClient(result.order);
  if (result.order.status === 'DELIVERED') {
    await notifyDeliveredClient(result.order);
    await notifyClientOrderStatus({ orderId: result.order.id, status: result.order.status, previousStatus: result.previousStatus });
  }

  if (!result.idempotent) {
    await resendOrderConfirmationEmail(result.order.id);
  }

  if (result.autoDelivered && !result.idempotent) {
    await sendDeliveryEmail({
      ...result.order,
      deliveries: result.order.deliveries
        .filter((delivery) => delivery.status === 'SENT' || delivery.status === 'VIEWED')
        .map((delivery) => ({
          deliveryType: delivery.deliveryType,
          deliveryContent: decryptDeliveryContent(delivery.deliveryContentEncrypted),
          activationGuide: delivery.activationGuide,
          restrictions: delivery.restrictions,
          region: delivery.region
        }))
    });
  } else if (!result.idempotent) {
    await sendPaymentApprovedEmail(result.order);
  }

  return serializeAdminOrder(result.order);
};

export const rejectAdminOrderPayment = async (orderId: string, reasonInput: unknown, req: AdminRequest) => {
  const reason = typeof reasonInput === 'string' && reasonInput.trim() ? reasonInput.trim() : 'Paiement rejete.';
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAYMENT_REJECTED',
      payments: {
        updateMany: {
          where: { status: { in: ['PENDING', 'SUBMITTED', 'APPROVED', 'PAID'] } },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            reviewedBy: req.user?.id || null,
            rejectionReason: reason
          }
        }
      },
      invoice: { update: { status: 'PAYMENT_REJECTED' } }
    },
    include: adminOrderInclude
  });

  await prisma.orderActionLog.create({
    data: { orderId: order.id, ...getActor(req), action: 'PAYMENT_REJECTED', ...requestMeta(req), metadata: { reason } }
  });
  await notifyClientOrderStatus({ orderId: order.id, status: order.status });

  await notifyRejectedClient(order, reason);
  await sendPaymentRejectedEmail(order, reason);

  try {
    const whatsapp = buildWhatsAppOrderMessage(
      order,
      `Commande ${order.orderNumber}, mon paiement a ete rejete. Motif: ${reason}. Pouvez-vous m'aider ?`
    );
    await sendWhatsappWebhookEvent({
      type: 'PAYMENT_REJECTED',
      orderNumber: order.orderNumber,
      amount: order.amount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      reason,
      whatsappUrl: whatsapp.url,
      message: whatsapp.message
    });
  } catch (error) {
    logger.error({ orderId: order.id, orderNumber: order.orderNumber, err: error }, 'payment_rejected_whatsapp_alert_failed');
  }

  return serializeAdminOrder(order);
};

export const createAdminOrderDelivery = async (
  orderId: string,
  payload: {
    deliveryContent?: unknown;
    deliveryType?: unknown;
    orderItemId?: unknown;
    activationGuide?: unknown;
    restrictions?: unknown;
    region?: unknown;
  },
  req: AdminRequest
) => {
  const content = typeof payload.deliveryContent === 'string' ? payload.deliveryContent.trim() : '';
  if (!content) throw new HttpError(400, 'Le contenu de livraison est obligatoire.');

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new HttpError(404, 'Commande introuvable.');
  if (!order.payments.some((payment) => isPaidPaymentStatus(payment.status))) {
    throw new HttpError(400, 'Le paiement doit etre approuve avant de preparer la livraison.');
  }

  const delivery = await prisma.delivery.create({
    data: {
      orderId: order.id,
      orderItemId: typeof payload.orderItemId === 'string' ? payload.orderItemId : null,
      status: 'READY',
      deliveryContentEncrypted: encryptDeliveryContent(content),
      deliveryType: typeof payload.deliveryType === 'string' ? payload.deliveryType : 'MIXED',
      activationGuide: typeof payload.activationGuide === 'string' ? payload.activationGuide : null,
      restrictions: typeof payload.restrictions === 'string' ? payload.restrictions : null,
      region: typeof payload.region === 'string' ? payload.region : null
    }
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: 'IN_DELIVERY' } });
  await prisma.orderActionLog.create({
    data: {
      orderId: order.id,
      ...getActor(req),
      action: 'DELIVERY_CREATED',
      ...requestMeta(req),
      metadata: { deliveryId: delivery.id, orderItemId: typeof payload.orderItemId === 'string' ? payload.orderItemId : null }
    }
  });
  await notifyClientOrderStatus({ orderId: order.id, status: 'IN_DELIVERY', previousStatus: order.status });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: adminOrderInclude
  });

  const inDeliveryContent = getOrderStatusNotificationContent(updated.orderNumber, 'IN_DELIVERY', order.status);
  await sendOrderStatusUpdateEmail(updated, 'IN_DELIVERY', inDeliveryContent.message);

  return serializeAdminOrder(updated);
};

export const sendAdminOrderDelivery = async (orderId: string, req: AdminRequest) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: adminOrderInclude
  });
  if (!order) throw new HttpError(404, 'Commande introuvable.');
  if (!order.payments.some((payment) => isPaidPaymentStatus(payment.status))) throw new HttpError(400, 'Paiement non approuve.');
  if (!order.deliveries.some((delivery) => delivery.status === 'READY' || delivery.status === 'LOCKED')) {
    throw new HttpError(400, 'Aucun contenu de livraison pret.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.delivery.updateMany({
      where: { orderId: order.id, status: { in: ['READY', 'LOCKED'] } },
      data: { status: 'SENT', sentAt: new Date(), sentBy: req.user?.id || null }
    });

    const deliveredOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED' },
      include: adminOrderInclude
    });

    await tx.orderActionLog.create({
      data: { orderId: order.id, ...getActor(req), action: 'DELIVERY_SENT', ...requestMeta(req), metadata: { deliveryCount: deliveredOrder.deliveries.length } }
    });

    await awardDeliveryLoyaltyPoints(tx, {
      orderId: deliveredOrder.id,
      userId: deliveredOrder.userId,
      orderNumber: deliveredOrder.orderNumber,
      totalAmount: deliveredOrder.total || deliveredOrder.amount
    });

    return deliveredOrder;
  });
  await notifyClientOrderStatus({ orderId: updated.id, status: updated.status, previousStatus: order.status });

  await notifyDeliveredClient(updated);

  await sendDeliveryEmail({
    ...updated,
    deliveries: updated.deliveries.map((delivery) => ({
      deliveryType: delivery.deliveryType,
      deliveryContent: decryptDeliveryContent(delivery.deliveryContentEncrypted),
      activationGuide: delivery.activationGuide,
      restrictions: delivery.restrictions,
      region: delivery.region
    }))
  });

  return serializeAdminOrder(updated);
};

export const resendAdminOrderDeliveryEmail = async (orderId: string, req: AdminRequest) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      invoice: true,
      payments: true,
      deliveries: true,
      user: { select: { id: true, username: true, email: true, avatarUrl: true } }
    }
  });
  if (!order) throw new HttpError(404, 'Commande introuvable.');

  const sentDeliveries = order.deliveries.filter((delivery) => delivery.status === 'SENT' || delivery.status === 'VIEWED');
  if (sentDeliveries.length === 0) throw new HttpError(400, 'Aucune livraison envoyee a renvoyer.');
  if (sentDeliveries.some((delivery) => delivery.resendCount >= 3)) {
    throw new HttpError(429, 'Limite de renvoi email atteinte pour cette commande.');
  }

  await sendDeliveryEmail({
    ...order,
    deliveries: sentDeliveries.map((delivery) => ({
      deliveryType: delivery.deliveryType,
      deliveryContent: decryptDeliveryContent(delivery.deliveryContentEncrypted),
      activationGuide: delivery.activationGuide,
      restrictions: delivery.restrictions,
      region: delivery.region
    }))
  });
  await prisma.delivery.updateMany({
    where: { orderId: order.id, id: { in: sentDeliveries.map((delivery) => delivery.id) } },
    data: { resendCount: { increment: 1 } }
  });
  await prisma.orderActionLog.create({
    data: { orderId: order.id, ...getActor(req), action: 'EMAIL_RESENT', ...requestMeta(req), metadata: { type: 'delivery' } }
  });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: adminOrderInclude
  });

  return serializeAdminOrder(updated);
};
