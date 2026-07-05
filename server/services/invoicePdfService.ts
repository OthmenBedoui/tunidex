import { promises as fs } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import prisma from '../prisma.js';
import { isStaffRole } from '../constants/roles.js';
import { readSiteConfig } from './siteConfigService.js';

type InvoiceOrderRecord = Awaited<ReturnType<typeof prisma.order.findUnique>>;

const formatMoney = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;
const formatDate = (value: Date | string) => new Date(value).toLocaleDateString('fr-FR');

const resolveLegalMentions = (siteConfig: Awaited<ReturnType<typeof readSiteConfig>>) => {
  const blocks = [
    siteConfig.invoiceIssuerName || siteConfig.seoOrganizationName || siteConfig.siteName,
    siteConfig.footerAddress,
    siteConfig.footerEmail ? `Email: ${siteConfig.footerEmail}` : '',
    siteConfig.footerPhone ? `Telephone: ${siteConfig.footerPhone}` : '',
    siteConfig.invoiceLegalMentions || '',
    siteConfig.footerCopyright || ''
  ].filter(Boolean);

  return blocks.join('\n');
};

const loadLogoBuffer = async (logoUrl?: string) => {
  if (!logoUrl) return null;

  try {
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    }

    if (logoUrl.startsWith('data:image/')) {
      const base64 = logoUrl.split(',')[1] || '';
      return base64 ? Buffer.from(base64, 'base64') : null;
    }

    const relativePath = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl;
    const absolutePath = path.join(process.cwd(), relativePath);
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
};

const withLine = (doc: PDFKit.PDFDocument, text: string, options?: PDFKit.Mixins.TextOptions) => {
  doc.text(text, options);
  return doc;
};

const buildInvoicePdf = async (order: NonNullable<InvoiceOrderRecord>) => {
  if (!order.invoice) {
    throw new Error('Facture introuvable pour cette commande.');
  }

  const siteConfig = await readSiteConfig();
  const logoBuffer = await loadLogoBuffer(siteConfig.logoUrl);
  const invoice = order.invoice;
  const currency = invoice.currency || order.currency || 'TND';
  const subtotal = order.subtotal ?? order.amount ?? invoice.totalAmount;
  const discount = order.discount ?? 0;
  const total = order.total ?? order.amount ?? invoice.totalAmount;
  const legalMentions = resolveLegalMentions(siteConfig);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 45, { fit: [120, 60] });
      } catch {
        // Ignore unsupported image formats in PDFs and continue without logo.
      }
    }

    doc
      .fontSize(24)
      .fillColor('#0f172a')
      .text(siteConfig.siteName || 'TuniBots', 320, 50, { align: 'right' })
      .moveDown(0.2);

    doc
      .fontSize(11)
      .fillColor('#475569')
      .text(`Facture ${invoice.invoiceNumber}`, 320, 82, { align: 'right' })
      .text(`Date: ${formatDate(invoice.issueDate)}`, { align: 'right' })
      .text(`Commande: ${order.orderNumber}`, { align: 'right' });

    doc.moveDown(3);

    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text('Facture pour', 50, 155)
      .fontSize(11)
      .fillColor('#334155');

    withLine(doc, `${invoice.customerFirstName} ${invoice.customerLastName}`.trim() || invoice.customerEmail);
    withLine(doc, invoice.customerEmail);
    if (invoice.customerPhone) withLine(doc, invoice.customerPhone);

    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text('Informations commande', 320, 155)
      .fontSize(11)
      .fillColor('#334155');

    withLine(doc, `Statut: ${order.status}`, { align: 'right' });
    withLine(doc, `Paiement: ${order.paymentMethod || 'Manuel'}`, { align: 'right' });
    if (order.couponCode) withLine(doc, `Coupon: ${order.couponCode}`, { align: 'right' });
    withLine(doc, `Emission: ${formatDate(invoice.issueDate)}`, { align: 'right' });

    const tableTop = 255;
    doc
      .moveTo(50, tableTop - 12)
      .lineTo(545, tableTop - 12)
      .strokeColor('#cbd5e1')
      .stroke();

    doc
      .fontSize(10)
      .fillColor('#64748b')
      .text('Produit', 50, tableTop)
      .text('Qte', 340, tableTop, { width: 40, align: 'right' })
      .text('PU', 390, tableTop, { width: 70, align: 'right' })
      .text('Total', 470, tableTop, { width: 75, align: 'right' });

    let y = tableTop + 22;
    for (const item of invoice.items || []) {
      doc
        .fontSize(10.5)
        .fillColor('#0f172a')
        .text(item.titleSnapshot, 50, y, { width: 270 })
        .text(String(item.quantity), 340, y, { width: 40, align: 'right' })
        .text(formatMoney(item.unitPrice, currency), 390, y, { width: 70, align: 'right' })
        .text(formatMoney(item.lineTotal, currency), 470, y, { width: 75, align: 'right' });

      y += 22;
      if (item.variantSnapshot) {
        doc
          .fontSize(9)
          .fillColor('#64748b')
          .text(item.variantSnapshot, 50, y, { width: 270 });
        y += 16;
      }
    }

    y += 10;
    doc
      .moveTo(310, y)
      .lineTo(545, y)
      .strokeColor('#cbd5e1')
      .stroke();

    y += 12;
    doc
      .fontSize(10.5)
      .fillColor('#334155')
      .text('Sous-total', 360, y, { width: 100, align: 'right' })
      .text(formatMoney(subtotal, currency), 470, y, { width: 75, align: 'right' });

    y += 18;
    doc
      .text('Remise', 360, y, { width: 100, align: 'right' })
      .text(formatMoney(discount, currency), 470, y, { width: 75, align: 'right' });
    if (order.couponCode) {
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(`Coupon applique: ${order.couponCode}`, 360, y + 14, { width: 185, align: 'right' });
      y += 8;
    }

    y += 22;
    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text('Total', 360, y, { width: 100, align: 'right' })
      .text(formatMoney(total, currency), 470, y, { width: 75, align: 'right' });

    y += 45;
    doc
      .fontSize(11)
      .fillColor('#0f172a')
      .text('Mentions legales', 50, y)
      .moveDown(0.4)
      .fontSize(9.5)
      .fillColor('#475569')
      .text(legalMentions || 'Mentions legales non configurees.', 50, doc.y, {
        width: 495,
        lineGap: 3
      });

    doc.end();
  });

  return {
    buffer,
    fileName: `${invoice.invoiceNumber}.pdf`,
    invoiceNumber: invoice.invoiceNumber
  };
};

export const getInvoiceOrderById = async (orderId: string) =>
  prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: {
        include: {
          items: true
        }
      },
      items: true
    }
  });

export const assertInvoiceAccess = (order: NonNullable<InvoiceOrderRecord>, user?: { id: string; role: string } | null) => {
  if (!user?.id) {
    throw new Error('Authentication required.');
  }

  if (isStaffRole(user.role) || order.userId === user.id) {
    return;
  }

  throw new Error('Vous ne pouvez pas telecharger cette facture.');
};

export const generateInvoicePdfBufferForOrder = async (orderId: string) => {
  const order = await getInvoiceOrderById(orderId);
  if (!order) {
    throw new Error('Commande introuvable.');
  }

  return buildInvoicePdf(order);
};
