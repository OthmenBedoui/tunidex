import prisma from '../prisma.js';
import logger from '../logger.js';
import { queueEmail } from './emailService.js';

type CheckoutOrderEmailPayload = {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod?: string | null;
  items: Array<{
    id: string;
    titleSnapshot: string;
    quantity: number;
    priceSnapshot: number;
  }>;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: Date;
    status: string;
  } | null;
};

type DeliveryEmailPayload = CheckoutOrderEmailPayload & {
  deliveries?: Array<{
    deliveryType: string;
    deliveryContent: string;
    activationGuide?: string | null;
    restrictions?: string | null;
    region?: string | null;
  }>;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;

const formatPaymentMethod = (method?: string | null) => {
  const labels: Record<string, string> = {
    whatsapp: 'WhatsApp / support',
    edinar: 'EDINAR',
    flouci: 'Flouci',
    click2pay: 'Click2Pay',
    carte: 'Carte bancaire',
    bank_transfer: 'Virement bancaire',
    d17: 'D17',
    flouci_manual: 'Flouci manuel'
  };

  return method ? labels[method.toLowerCase()] || method : 'A confirmer';
};

const formatOrderDate = (value?: Date | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : '');

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Paiement en attente',
  PAYMENT_UNDER_REVIEW: 'Commande recue',
  PAYMENT_RECEIVED: 'Preuve de paiement recue',
  PAYMENT_APPROVED: 'Paiement approuve',
  PAID: 'Paiement verifie',
  IN_DELIVERY: 'Livraison en preparation',
  DELIVERED: 'Commande livree',
  COMPLETED: 'Commande terminee',
  PAYMENT_REJECTED: 'Paiement rejete',
  CANCELLED: 'Commande annulee',
  REFUNDED: 'Commande remboursee'
};

const buildItemsRows = (order: CheckoutOrderEmailPayload) =>
  order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">
            ${escapeHtml(item.titleSnapshot)}
            <div style="color:#64748b;font-size:12px;margin-top:4px;">Quantité: ${item.quantity}</div>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;text-align:right;">
            ${formatMoney(item.priceSnapshot * item.quantity, order.currency)}
          </td>
        </tr>
      `
    )
    .join('');

const buildOrderTemplateVariables = (order: CheckoutOrderEmailPayload) => {
  const customerName = `${order.customerFirstName} ${order.customerLastName}`.trim() || order.customerFirstName;

  return {
    orderId: order.id,
    invoiceId: order.invoice?.id || '',
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoice?.invoiceNumber || 'En attente',
    invoiceDate: formatOrderDate(order.invoice?.issueDate) || 'A confirmer',
    customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    paymentMethod: formatPaymentMethod(order.paymentMethod),
    totalAmount: formatMoney(order.amount, order.currency),
    amount: order.amount.toFixed(2),
    currency: order.currency,
    itemsRows: buildItemsRows(order)
  };
};

const queueOrderEmailTemplate = async (template: string, order: CheckoutOrderEmailPayload, extraPayload?: Record<string, unknown>) => {
  const payload = {
    ...buildOrderTemplateVariables(order),
    ...extraPayload
  };

  await queueEmail({
    to: order.customerEmail,
    template,
    payload
  });
};

export const sendOrderConfirmationEmail = async (order: CheckoutOrderEmailPayload) => {
  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        emailStatus: 'PENDING',
        emailSentAt: null,
        emailError: null
      }
    });

    if (order.invoice?.id) {
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: {
          emailSentAt: null,
          emailError: null
        }
      });
    }

    await queueOrderEmailTemplate('orderConfirmation', order, { attachInvoicePdf: true });
    if (order.invoice?.id) {
      await queueOrderEmailTemplate('invoice', order, { attachInvoicePdf: true });
    }

    return { status: 'PENDING', error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email queue failed';

    await prisma.order.update({
      where: { id: order.id },
      data: {
        emailStatus: 'FAILED',
        emailError: message
      }
    });

    if (order.invoice?.id) {
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: { emailError: message }
      });
    }

    logger.error({ orderId: order.id, err: error }, 'checkout_email_queue_failed');
    return { status: 'FAILED', error: message };
  }
};

export const resendOrderConfirmationEmail = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      invoice: true
    }
  });

  if (!order) {
    throw new Error('Commande introuvable.');
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        emailStatus: 'PENDING',
        emailError: null
      }
    });

    if (order.invoice?.id) {
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: { emailError: null }
      });
    }

    await queueOrderEmailTemplate('invoice', order, { attachInvoicePdf: true });
    return { status: 'PENDING', error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email queue failed';
    await prisma.order.update({
      where: { id: order.id },
      data: {
        emailStatus: 'FAILED',
        emailError: message
      }
    });
    return { status: 'FAILED', error: message };
  }
};

export const sendPaymentApprovedEmail = async (order: CheckoutOrderEmailPayload) => {
  try {
    await queueOrderEmailTemplate('paymentApproved', order);
    return { status: 'PENDING', error: null };
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email queue failed' };
  }
};

export const sendOrderStatusUpdateEmail = async (
  order: CheckoutOrderEmailPayload,
  status: string,
  statusMessage: string
) => {
  try {
    await queueOrderEmailTemplate('orderStatusUpdate', order, {
      statusLabel: STATUS_LABELS[status] || status,
      statusMessage
    });
    return { status: 'PENDING', error: null };
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email queue failed' };
  }
};

export const sendPaymentRejectedEmail = async (order: CheckoutOrderEmailPayload, reason: string) => {
  try {
    await queueOrderEmailTemplate('paymentRejected', order, { reason });
    return { status: 'PENDING', error: null };
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email queue failed' };
  }
};

export const sendDeliveryEmail = async (order: DeliveryEmailPayload) => {
  try {
    const customerName = `${order.customerFirstName} ${order.customerLastName}`.trim() || order.customerFirstName;
    const deliveryRows = (order.deliveries || [])
      .map(
        (delivery) => `
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin:12px 0;background:#f8fafc;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(delivery.deliveryType)}</div>
            <pre style="white-space:pre-wrap;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:14px;color:#0f172a;overflow:auto;">${escapeHtml(delivery.deliveryContent)}</pre>
            ${delivery.activationGuide ? `<p style="font-size:14px;color:#475569;"><strong>Activation:</strong> ${escapeHtml(delivery.activationGuide)}</p>` : ''}
            ${delivery.restrictions ? `<p style="font-size:14px;color:#475569;"><strong>Restrictions:</strong> ${escapeHtml(delivery.restrictions)}</p>` : ''}
            ${delivery.region ? `<p style="font-size:14px;color:#475569;"><strong>Région:</strong> ${escapeHtml(delivery.region)}</p>` : ''}
          </div>
        `
      )
      .join('');

    await queueEmail({
      to: order.customerEmail,
      template: 'delivery',
      payload: {
        ...buildOrderTemplateVariables(order),
        customerName,
        deliveryRows
      }
    });

    return { status: 'PENDING', error: null };
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email queue failed' };
  }
};
