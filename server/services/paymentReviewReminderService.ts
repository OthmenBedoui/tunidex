import prisma from '../prisma.js';
import logger from '../logger.js';
import { readSiteConfig } from './siteConfigService.js';
import { sendWhatsappWebhookEvent } from './whatsappBotService.js';

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

export const processPaymentReviewReminders = async () => {
  const siteConfig = await readSiteConfig();
  const reminderHours = Math.max(1, Number(siteConfig.paymentReviewReminderHours || 4));
  const cutoff = new Date(Date.now() - reminderHours * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAYMENT_UNDER_REVIEW', 'PAYMENT_RECEIVED'] },
      payments: {
        some: {
          status: 'SUBMITTED',
          declaredAt: { lte: cutoff }
        }
      }
    },
    include: {
      payments: true,
      actionLogs: {
        where: { action: 'PAYMENT_REVIEW_REMINDER_SENT' },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  for (const order of orders) {
    const latestPayment = [...order.payments]
      .filter((payment) => payment.status === 'SUBMITTED' && payment.declaredAt)
      .sort((a, b) => new Date(b.declaredAt || b.submittedAt).getTime() - new Date(a.declaredAt || a.submittedAt).getTime())[0];

    if (!latestPayment) continue;

    const latestReminder = order.actionLogs[0];
    if (latestReminder?.createdAt && latestReminder.createdAt >= latestPayment.declaredAt!) {
      continue;
    }

    const message = `Commande ${order.orderNumber} en attente de verification depuis plus de ${reminderHours}h. Montant ${order.amount.toFixed(2)} ${order.currency}, methode ${order.paymentMethod || latestPayment.method}.`;

    try {
      const result = await sendWhatsappWebhookEvent({
        type: 'PAYMENT_REVIEW_REMINDER',
        orderNumber: order.orderNumber,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: order.paymentMethod || latestPayment.method,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        reference: latestPayment.reference || latestPayment.customerReference || null,
        proofUrl: latestPayment.proofUrl || latestPayment.proofFileUrl || null,
        reminderHours,
        message
      });

      await prisma.orderActionLog.create({
        data: {
          orderId: order.id,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'PAYMENT_REVIEW_REMINDER_SENT',
          metadata: {
            reminderHours,
            paymentId: latestPayment.id,
            status: result.status
          }
        }
      });

      if (result.status === 'FAILED') {
        logger.error({ orderId: order.id, orderNumber: order.orderNumber, error: result.error }, 'payment_review_reminder_failed');
      }
    } catch (error) {
      logger.error({ orderId: order.id, orderNumber: order.orderNumber, err: error }, 'payment_review_reminder_failed');
    }
  }
};

let reminderTimer: NodeJS.Timeout | null = null;
let reminderRunning = false;

const runReminderCycle = async () => {
  if (reminderRunning) return;

  reminderRunning = true;
  try {
    await processPaymentReviewReminders();
  } catch (error) {
    logger.error({ err: error }, 'payment_review_reminder_cycle_failed');
  } finally {
    reminderRunning = false;
  }
};

export const startPaymentReviewReminderWorker = () => {
  if (reminderTimer) return;

  reminderTimer = setInterval(() => {
    void runReminderCycle();
  }, REMINDER_INTERVAL_MS);

  void runReminderCycle();
  logger.info({ intervalMs: REMINDER_INTERVAL_MS }, 'payment_review_reminder_worker_started');
};
