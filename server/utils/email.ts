import nodemailer from 'nodemailer';
import prisma from '../prisma.js';
import env from '../config/env.js';
import logger from '../logger.js';

const SITE_CONFIG_KEY = 'site';

type SendEmailOptions = {
  text?: string;
  replyTo?: string;
  messageType?: 'transactional' | 'generic';
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

type EmailTemplateDefinition = {
  subject: string;
  html: string;
};

const TEMPLATE_ALIASES: Record<string, string[]> = {
  orderConfirmation: ['orderInvoice'],
  invoice: ['orderInvoice']
};

export const EMAIL_TEMPLATE_KEYS = [
  'registrationOtp',
  'orderConfirmation',
  'orderStatusUpdate',
  'paymentApproved',
  'paymentRejected',
  'delivery',
  'invoice',
  'testEmail'
] as const;

const buildEmailShell = ({
  logoUrl,
  siteName,
  accentColor,
  accentSoftColor,
  accentTextColor,
  preheader,
  title,
  eyebrow,
  bodyHtml,
  footerEmail,
  footerPhone
}: {
  logoUrl?: string;
  siteName: string;
  accentColor: string;
  accentSoftColor: string;
  accentTextColor: string;
  preheader?: string;
  title: string;
  eyebrow: string;
  bodyHtml: string;
  footerEmail?: string;
  footerPhone?: string;
}) => `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader || title}</div>
  <div style="margin:0;padding:32px 12px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:28px 28px 20px;background:linear-gradient(135deg,#020617 0%,#111827 100%);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;">
                <div style="display:flex;align-items:center;gap:14px;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}" style="max-height:48px;max-width:160px;display:block;object-fit:contain;" />` : ''}
                  <div style="font-size:28px;font-weight:900;letter-spacing:0.02em;color:#ffffff;">${siteName}</div>
                </div>
                <div style="display:inline-block;margin-top:18px;padding:6px 10px;border-radius:999px;background:${accentSoftColor};color:${accentTextColor};font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${eyebrow}</div>
                <h1 style="margin:16px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">${title}</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;">
          <div style="border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;padding:18px;font-size:13px;line-height:1.7;color:#64748b;">
            <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Support ${siteName}</div>
            <div>Besoin d'aide ? Répondez simplement à cet email.</div>
            ${footerEmail ? `<div>Email: ${footerEmail}</div>` : ''}
            ${footerPhone ? `<div>Téléphone: ${footerPhone}</div>` : ''}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;color:#94a3b8;font-size:12px;line-height:1.6;">
          Email transactionnel automatique ${siteName}. Merci de ne pas partager vos codes et accès avec des tiers.
        </td>
      </tr>
    </table>
  </div>
`;

export const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplateDefinition> = {
  registrationOtp: {
    subject: 'Code de vérification TuniBots',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre code OTP TuniBots',
      eyebrow: 'Sécurité du compte',
      title: 'Confirmez votre inscription',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{username}}, utilisez ce code OTP pour confirmer votre adresse email sur TuniBots.</p>
        <div style="margin:24px 0;padding:18px;border-radius:20px;background:{{accentSoftColor}};border:1px solid rgba(15,23,42,0.08);text-align:center;">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:{{accentTextColor}};">Code OTP</div>
          <div style="margin-top:10px;font-size:34px;font-weight:900;letter-spacing:10px;color:#0f172a;">{{otpCode}}</div>
        </div>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">Ce code expire dans <strong>{{otpExpiryMinutes}} minutes</strong>.</p>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  orderConfirmation: {
    subject: 'Commande TuniBots {{orderNumber}} enregistrée',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre commande a bien été enregistrée',
      eyebrow: 'Commande',
      title: 'Confirmation de commande',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, votre commande <strong>{{orderNumber}}</strong> a bien été enregistrée. Notre équipe vérifie maintenant le paiement.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:22px 0;">
          <div style="padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Total</div>
            <div style="margin-top:8px;font-size:22px;font-weight:900;color:#0f172a;">{{totalAmount}}</div>
          </div>
          <div style="padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Paiement</div>
            <div style="margin-top:8px;font-size:18px;font-weight:800;color:#0f172a;">{{paymentMethod}}</div>
            <div style="margin-top:6px;font-size:13px;color:#475569;">Statut initial: PAYMENT_UNDER_REVIEW</div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="padding:14px 16px;background:#f8fafc;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Produits</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody>{{itemsRows}}</tbody></table>
        </div>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  orderStatusUpdate: {
    subject: 'Mise a jour commande {{orderNumber}}',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Le suivi de votre commande a evolue',
      eyebrow: 'Suivi commande',
      title: 'Nouvelle etape pour votre commande',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, votre commande <strong>{{orderNumber}}</strong> vient de passer a une nouvelle etape.</p>
        <div style="padding:18px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:14px;line-height:1.7;">
          <div style="font-weight:800;margin-bottom:6px;">Statut actuel</div>
          <div>{{statusLabel}}</div>
          <div style="margin-top:10px;color:#475569;">{{statusMessage}}</div>
        </div>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  paymentApproved: {
    subject: 'Paiement approuvé - {{orderNumber}}',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre paiement a été approuvé',
      eyebrow: 'Paiement',
      title: 'Paiement approuvé',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, le paiement de votre commande <strong>{{orderNumber}}</strong> a été approuvé.</p>
        <div style="padding:18px;border-radius:18px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:14px;font-weight:700;">Votre commande passe maintenant en préparation.</div>
        <div style="margin-top:18px;font-size:14px;line-height:1.8;color:#475569;">
          <div>Total: <strong style="color:#0f172a;">{{totalAmount}}</strong></div>
          <div>Facture: <strong style="color:#0f172a;">{{invoiceNumber}}</strong></div>
        </div>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  paymentRejected: {
    subject: 'Paiement rejeté - {{orderNumber}}',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre paiement a été rejeté',
      eyebrow: 'Paiement',
      title: 'Paiement rejeté',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, le paiement de votre commande <strong>{{orderNumber}}</strong> n'a pas pu être validé.</p>
        <div style="padding:18px;border-radius:18px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:14px;line-height:1.7;">
          <div style="font-weight:800;margin-bottom:6px;">Motif</div>
          <div>{{reason}}</div>
        </div>
        <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#475569;">Vous pouvez répondre à cet email pour obtenir de l'aide et soumettre un nouveau justificatif si nécessaire.</p>
        <div style="margin-top:18px;">
          <a href="{{supportWhatsAppUrl}}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:800;">Contacter le support sur WhatsApp</a>
        </div>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  delivery: {
    subject: 'Livraison digitale - {{orderNumber}}',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre commande est livrée',
      eyebrow: 'Livraison',
      title: 'Votre commande est livrée',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, voici le contenu de livraison pour la commande <strong>{{orderNumber}}</strong>.</p>
        {{deliveryRows}}
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  invoice: {
    subject: 'Facture TuniBots {{invoiceNumber}}',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Votre facture TuniBots est prête',
      eyebrow: 'Facture',
      title: 'Votre facture est disponible',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Bonjour {{customerName}}, votre facture <strong>{{invoiceNumber}}</strong> a bien été générée pour la commande <strong>{{orderNumber}}</strong>.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:22px 0;">
          <div style="padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Montant</div>
            <div style="margin-top:8px;font-size:22px;font-weight:900;color:#0f172a;">{{totalAmount}}</div>
          </div>
          <div style="padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
            <div style="margin-top:8px;font-size:18px;font-weight:800;color:#0f172a;">{{invoiceDate}}</div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="padding:14px 16px;background:#f8fafc;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Récapitulatif</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody>{{itemsRows}}</tbody></table>
        </div>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  },
  testEmail: {
    subject: 'Test email TuniBots',
    html: buildEmailShell({
      logoUrl: '{{logoUrl}}',
      siteName: '{{siteName}}',
      accentColor: '{{accentColor}}',
      accentSoftColor: '{{accentSoftColor}}',
      accentTextColor: '{{accentTextColor}}',
      preheader: 'Vérification SMTP TuniBots',
      eyebrow: 'Diagnostic',
      title: 'Configuration email valide',
      bodyHtml: `
        <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">Ce message confirme que le SMTP configuré dans l'admin TuniBots peut envoyer des emails transactionnels.</p>
      `,
      footerEmail: '{{footerEmail}}',
      footerPhone: '{{footerPhone}}'
    })
  }
};

export const renderTemplate = (template: string, variables: Record<string, string | number | null | undefined>) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => String(variables[key] ?? ''));

const ensureHtmlDocument = (html: string) => {
  if (/<html[\s>]/i.test(html)) {
    return html;
  }

  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="color-scheme" content="light only" />',
    '<meta name="supported-color-schemes" content="light only" />',
    '<title>TuniBots</title>',
    '</head>',
    `<body style="margin:0;padding:0;background:#f8fafc;">${html}</body>`,
    '</html>'
  ].join('');
};

export const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|tr|table|li|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const resolveTemplateCandidates = (key: string) => [key, ...(TEMPLATE_ALIASES[key] || [])];

export const getEmailTemplate = async (key: string) => {
  const record = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });
  const config = record?.data as { emailTemplates?: Record<string, { subject?: string; html?: string }> } | undefined;
  const candidates = resolveTemplateCandidates(key);

  for (const candidate of candidates) {
    const saved = config?.emailTemplates?.[candidate];
    const fallback = DEFAULT_EMAIL_TEMPLATES[candidate];
    if (saved || fallback) {
      return {
        subject: saved?.subject || fallback?.subject || '',
        html: saved?.html || fallback?.html || ''
      };
    }
  }

  return { subject: '', html: '' };
};

export const buildEmailTemplateVariables = async (variables: Record<string, string | number | null | undefined>) => {
  const { defaultSiteConfig, readSiteConfig } = await import('../services/siteConfigService.js');
  const siteConfig = await readSiteConfig();
  return {
    siteName: siteConfig.siteName || defaultSiteConfig.siteName,
    logoUrl: siteConfig.logoUrl || '',
    accentColor: siteConfig.accentColor || defaultSiteConfig.accentColor,
    accentSoftColor: siteConfig.accentSoftColor || defaultSiteConfig.accentSoftColor,
    accentTextColor: siteConfig.accentTextColor || defaultSiteConfig.accentTextColor,
    footerEmail: siteConfig.footerEmail || defaultSiteConfig.footerEmail,
    footerPhone: siteConfig.footerPhone || defaultSiteConfig.footerPhone,
    footerWhatsapp: siteConfig.footerWhatsapp || defaultSiteConfig.footerWhatsapp,
    supportWhatsAppUrl: `https://wa.me/${(siteConfig.footerWhatsapp || defaultSiteConfig.footerWhatsapp || '').replace(/\D/g, '')}`,
    ...variables
  };
};

const fallbackTransport = {
  mode: 'json' as const,
  from: '"TuniBots" <noreply@tunibots.tn>'
};

const extractEmailAddress = (value: string) => {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
};

const readMailerConfig = async () => {
  const smtpHost = env.smtpHost;
  const smtpPort = env.smtpPort;
  const smtpFrom = env.smtpFrom;

  if (smtpHost && smtpPort) {
    const secure = env.smtpSecure;
    const smtpUser = env.smtpUser;
    const smtpPass = env.smtpPass ?? '';
    return {
      mode: 'smtp' as const,
      host: smtpHost,
      port: Number(smtpPort),
      secure,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass
          }
        : undefined,
      from: smtpFrom || fallbackTransport.from
    };
  }

  try {
    const record = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });
    const config = record?.data as {
      smtpHost?: string;
      smtpPort?: string;
      smtpEmailId?: string;
      smtpEncryption?: string;
      smtpUsername?: string;
      smtpPassword?: string;
      smtpMailerName?: string;
    } | undefined;

    if (config?.smtpHost && config?.smtpPort && config?.smtpEmailId) {
      return {
        mode: 'smtp' as const,
        host: config.smtpHost,
        port: Number(config.smtpPort),
        secure: config.smtpEncryption === 'ssl',
        auth: config.smtpUsername || config.smtpPassword
          ? {
              user: config.smtpUsername || config.smtpEmailId,
              pass: config.smtpPassword || ''
            }
          : undefined,
        from: `"${config.smtpMailerName || 'TuniBots'}" <${config.smtpEmailId}>`
      };
    }
  } catch (error) {
    logger.warn({ err: error }, 'email_fallback_transport_in_use');
  }

  return fallbackTransport;
};

const createTransporter = async () => {
  const config = await readMailerConfig();
  if (config.mode === 'json') {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });
};

export const sendEmail = async (to: string, subject: string, html: string, options: SendEmailOptions = {}) => {
  try {
    const config = await readMailerConfig();
    const transporter = await createTransporter();
    const htmlDocument = ensureHtmlDocument(html);
    const fromAddress = extractEmailAddress(config.from);
    const fromDomain = fromAddress.includes('@') ? fromAddress.split('@')[1] : 'localhost';
    const headers =
      options.messageType === 'transactional'
        ? {
            'X-Auto-Response-Suppress': 'All',
            'Auto-Submitted': 'auto-generated'
          }
        : undefined;

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html: htmlDocument,
      text: options.text || htmlToText(htmlDocument),
      replyTo: options.replyTo || fromAddress,
      attachments: options.attachments,
      envelope: {
        from: fromAddress,
        to
      },
      headers,
      date: new Date(),
      messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@${fromDomain}>`
    });

    logger.info(
      {
        to,
        subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        previewUrl: nodemailer.getTestMessageUrl(info)
      },
      'email_sent'
    );

    return info;
  } catch (error) {
    logger.error({ err: error, to, subject }, 'email_send_failed');
    throw error;
  }
};
