import prisma from '../prisma.js';
import logger from '../logger.js';
import { sendWhatsappWebhookEvent } from './whatsappBotService.js';

const SITE_CONFIG_KEY = 'site';

type OrderNotificationPayload = {
  id?: string;
  orderNumber: string;
  status?: string;
  amount: number;
  currency: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod?: string | null;
  items: Array<{ titleSnapshot: string; quantity: number }>;
};

type NotificationConfig = {
  whatsappNotificationsEnabled?: boolean;
  whatsappNotificationWebhookUrl?: string;
  telegramNotificationsEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  messengerNotificationsEnabled?: boolean;
  messengerNotificationWebhookUrl?: string;
};

const buildMessage = (order: OrderNotificationPayload) => {
  const customerName = `${order.customerFirstName} ${order.customerLastName}`.trim();
  const products = order.items.map((item) => `- ${item.titleSnapshot} x${item.quantity}`).join('\n');
  return [
    'Nouvelle commande TuniBots à traiter',
    `Commande: ${order.orderNumber}`,
    `Client: ${customerName || 'Client'}`,
    `Téléphone: ${order.customerPhone}`,
    `Email: ${order.customerEmail}`,
    `Paiement: ${order.paymentMethod || 'A confirmer'}`,
    `Total: ${order.amount.toFixed(2)} ${order.currency}`,
    'Produits:',
    products
  ].join('\n');
};

const postJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Webhook failed with status ${response.status}`);
};

export const notifyNewOrder = async (order: OrderNotificationPayload) => {
  const record = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });
  const config = (record?.data || {}) as NotificationConfig;
  const message = buildMessage(order);
  const jobs: Promise<unknown>[] = [];

  if (config.whatsappNotificationsEnabled && config.whatsappNotificationWebhookUrl) {
    jobs.push(postJson(config.whatsappNotificationWebhookUrl, { type: 'NEW_ORDER', message, order }));
  }

  if (order.status === 'PAYMENT_UNDER_REVIEW') {
    jobs.push(
      sendWhatsappWebhookEvent({
        type: 'ORDER_PAYMENT_UNDER_REVIEW',
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        customerName: `${order.customerFirstName} ${order.customerLastName}`.trim() || 'Client',
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        items: order.items,
        message
      }).then((result) => {
        if (result.status !== 'SENT') {
          throw new Error(result.error || 'WhatsApp webhook failed.');
        }
      })
    );
  }

  if (config.messengerNotificationsEnabled && config.messengerNotificationWebhookUrl) {
    jobs.push(postJson(config.messengerNotificationWebhookUrl, { type: 'NEW_ORDER', message, order }));
  }

  if (config.telegramNotificationsEnabled && config.telegramBotToken && config.telegramChatId) {
    jobs.push(postJson(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      chat_id: config.telegramChatId,
      text: message
    }));
  }

  const results = await Promise.allSettled(jobs);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      logger.error({ err: result.reason, orderNumber: order.orderNumber }, 'order_notification_failed');
    }
  });
};
