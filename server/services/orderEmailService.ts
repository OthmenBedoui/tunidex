import prisma from '../prisma.js';
import { sendEmail } from '../utils/email.js';

type CheckoutOrderEmailPayload = {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;

const buildItemsRows = (order: CheckoutOrderEmailPayload) =>
  order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">
            ${escapeHtml(item.titleSnapshot)}
            <div style="color:#64748b;font-size:12px;margin-top:4px;">Quantité: ${item.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;text-align:right;">
            ${formatMoney(item.priceSnapshot * item.quantity, order.currency)}
          </td>
        </tr>
      `
    )
    .join('');

const buildOrderConfirmationEmail = (order: CheckoutOrderEmailPayload) => {
  const customerName = `${order.customerFirstName} ${order.customerLastName}`.trim();
  const invoiceBlock = order.invoice
    ? `
      <div style="margin-top:16px;padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">Facture / Proforma</div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:6px;">${escapeHtml(order.invoice.invoiceNumber)}</div>
        <div style="font-size:14px;color:#475569;margin-top:6px;">Date: ${new Date(order.invoice.issueDate).toLocaleDateString('fr-FR')}</div>
        <div style="font-size:14px;color:#475569;">Statut: En attente de paiement</div>
      </div>
    `
    : '';

  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e2e8f0;">
        <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Commande enregistrée</div>
        <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.2;">Votre commande a bien été enregistrée</h1>
        <p style="margin:0 0 18px;color:#475569;font-size:15px;">Bonjour ${escapeHtml(customerName || order.customerFirstName)}, votre commande Tunidex est en attente de paiement. Un agent vous contactera sur WhatsApp pour finaliser le règlement.</p>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:24px 0;">
          <div style="padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">Numéro de commande</div>
            <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:6px;">${escapeHtml(order.orderNumber)}</div>
          </div>
          <div style="padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">Montant total</div>
            <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:6px;">${formatMoney(order.amount, order.currency)}</div>
          </div>
        </div>

        ${invoiceBlock}

        <div style="margin-top:24px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;margin-bottom:12px;">Récapitulatif</div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>
              ${buildItemsRows(order)}
            </tbody>
          </table>
        </div>

        <div style="margin-top:24px;padding:18px;border-radius:18px;background:#fff7ed;border:1px solid #fdba74;">
          <div style="font-weight:700;color:#9a3412;margin-bottom:8px;">Paiement en attente</div>
          <div style="font-size:14px;color:#7c2d12;">Votre facture / proforma a été générée. Un agent Tunidex vous contactera sur WhatsApp au ${escapeHtml(order.customerPhone)} pour finaliser le paiement.</div>
        </div>

        <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Conservez ce message et votre numéro de commande pour le suivi.</p>
      </div>
    </div>
  `;
};

export const sendOrderConfirmationEmail = async (order: CheckoutOrderEmailPayload) => {
  try {
    await sendEmail(
      order.customerEmail,
      `Commande enregistrée ${order.orderNumber}`,
      buildOrderConfirmationEmail(order)
    );

    const now = new Date();
    await prisma.order.update({
      where: { id: order.id },
      data: {
        emailStatus: 'SENT',
        emailSentAt: now,
        emailError: null
      }
    });

    if (order.invoice?.id) {
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: {
          emailSentAt: now,
          emailError: null
        }
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP send failed';
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

    console.error('[checkout-email] send failed', { orderId: order.id, message });
  }
};
