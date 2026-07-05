import prisma from '../prisma.js';
import logger from '../logger.js';
import {
  buildEmailTemplateVariables,
  getEmailTemplate,
  htmlToText,
  renderTemplate,
  sendEmail
} from '../utils/email.js';
import { generateInvoicePdfBufferForOrder } from './invoicePdfService.js';

const EMAIL_OUTBOX_INTERVAL_MS = 15000;
const EMAIL_OUTBOX_BATCH_SIZE = 10;
const EMAIL_OUTBOX_MAX_ATTEMPTS = 5;

type EmailTemplatePayload = Record<string, unknown>;

type QueueEmailInput = {
  to: string;
  template: string;
  payload: EmailTemplatePayload;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toTemplateVariables = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === 'string' || typeof value === 'number' ? value : value == null ? null : String(value)
    ])
  ) as Record<string, string | number | null | undefined>;

const getRetryDelayMs = (attempts: number) => {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** exponent);
};

const getOrderIdFromPayload = (payload: Record<string, unknown>) =>
  typeof payload.orderId === 'string' && payload.orderId ? payload.orderId : null;

const getInvoiceIdFromPayload = (payload: Record<string, unknown>) =>
  typeof payload.invoiceId === 'string' && payload.invoiceId ? payload.invoiceId : null;

const syncRelatedEmailSuccess = async (payload: Record<string, unknown>) => {
  const orderId = getOrderIdFromPayload(payload);
  const invoiceId = getInvoiceIdFromPayload(payload);
  const now = new Date();

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        emailStatus: 'SENT',
        emailSentAt: now,
        emailError: null
      }
    });
  }

  if (invoiceId) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        emailSentAt: now,
        emailError: null
      }
    });
  }
};

const syncRelatedEmailFailure = async (payload: Record<string, unknown>, message: string) => {
  const orderId = getOrderIdFromPayload(payload);
  const invoiceId = getInvoiceIdFromPayload(payload);

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        emailStatus: 'FAILED',
        emailError: message
      }
    });
  }

  if (invoiceId) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        emailError: message
      }
    });
  }
};

const renderOutboxEmail = async (templateKey: string, payload: Record<string, unknown>) => {
  const template = await getEmailTemplate(templateKey);
  const variables = await buildEmailTemplateVariables(toTemplateVariables(payload));
  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.html, variables);
  const text = htmlToText(html);

  return { subject, html, text };
};

const buildInvoiceAttachment = async (payload: Record<string, unknown>) => {
  if (!payload.attachInvoicePdf) {
    return [];
  }

  const orderId = getOrderIdFromPayload(payload);
  if (!orderId) {
    return [];
  }

  const invoice = await generateInvoicePdfBufferForOrder(orderId);
  return [
    {
      filename: invoice.fileName,
      content: invoice.buffer,
      contentType: 'application/pdf'
    }
  ];
};

export const queueEmail = async ({ to, template, payload }: QueueEmailInput) => {
  const rendered = await renderOutboxEmail(template, payload);

  const item = await prisma.emailOutbox.create({
    data: {
      to,
      subject: rendered.subject,
      template,
      payload,
      status: 'PENDING'
    }
  });

  logger.info({ emailOutboxId: item.id, to, template }, 'email_queued');
  return item;
};

export const getFailedEmailOutbox = async (limit = 100) => {
  const items = await prisma.emailOutbox.findMany({
    where: { status: 'FAILED' },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Math.max(limit, 1), 100)
  });

  return items.map((item) => ({
    id: item.id,
    to: item.to,
    subject: item.subject,
    template: item.template,
    status: item.status,
    attempts: item.attempts,
    lastError: item.lastError,
    sentAt: item.sentAt,
    nextAttemptAt: item.nextAttemptAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    payload: isRecord(item.payload) ? item.payload : {}
  }));
};

export const retryFailedEmail = async (id: string) => {
  const item = await prisma.emailOutbox.findUnique({ where: { id } });
  if (!item) {
    throw new Error('Email introuvable.');
  }

  return prisma.emailOutbox.update({
    where: { id },
    data: {
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      nextAttemptAt: new Date()
    }
  });
};

export const processEmailOutbox = async () => {
  const now = new Date();
  const items = await prisma.emailOutbox.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: EMAIL_OUTBOX_MAX_ATTEMPTS },
      nextAttemptAt: { lte: now }
    },
    orderBy: [{ createdAt: 'asc' }],
    take: EMAIL_OUTBOX_BATCH_SIZE
  });

  for (const item of items) {
    const payload = isRecord(item.payload) ? item.payload : {};
    const processedAt = new Date();

    try {
      const rendered = await renderOutboxEmail(item.template, payload);
      const attachments = await buildInvoiceAttachment(payload);
      await sendEmail(item.to, rendered.subject, rendered.html, {
        text: rendered.text,
        messageType: item.template === 'testEmail' ? 'generic' : 'transactional',
        attachments
      });

      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: {
          subject: rendered.subject,
          status: 'SENT',
          attempts: { increment: 1 },
          lastError: null,
          sentAt: processedAt,
          nextAttemptAt: processedAt
        }
      });

      await syncRelatedEmailSuccess(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP send failed';
      const nextAttempts = item.attempts + 1;
      const nextAttemptAt =
        nextAttempts >= EMAIL_OUTBOX_MAX_ATTEMPTS
          ? processedAt
          : new Date(Date.now() + getRetryDelayMs(nextAttempts));

      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          attempts: nextAttempts,
          lastError: message,
          nextAttemptAt
        }
      });

      await syncRelatedEmailFailure(payload, message);
      logger.error({ emailOutboxId: item.id, to: item.to, template: item.template, attempts: nextAttempts, err: error }, 'email_outbox_send_failed');
    }
  }
};

let workerTimer: NodeJS.Timeout | null = null;
let workerIsRunning = false;

const runEmailOutboxCycle = async () => {
  if (workerIsRunning) {
    return;
  }

  workerIsRunning = true;
  try {
    await processEmailOutbox();
  } catch (error) {
    logger.error({ err: error }, 'email_outbox_cycle_failed');
  } finally {
    workerIsRunning = false;
  }
};

export const startEmailOutboxWorker = () => {
  if (workerTimer) {
    return;
  }

  workerTimer = setInterval(() => {
    void runEmailOutboxCycle();
  }, EMAIL_OUTBOX_INTERVAL_MS);

  void runEmailOutboxCycle();
  logger.info({ intervalMs: EMAIL_OUTBOX_INTERVAL_MS }, 'email_outbox_worker_started');
};
