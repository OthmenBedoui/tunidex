
import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { DEFAULT_EMAIL_TEMPLATES, getEmailTemplate, renderTemplate, sendEmail } from '../utils/email.js';
import { resendOrderConfirmationEmail, sendDeliveryEmail, sendPaymentApprovedEmail } from '../services/orderEmailService.js';
import { encryptDeliveryContent, decryptDeliveryContent } from '../services/deliverySecurityService.js';
import { notifyClientOrderStatus, sendCustomClientNotification } from '../services/clientNotificationService.js';
import { buildUniqueProductSlug, buildUniqueProductSlugFromInput } from '../utils/productSlug.js';

const SITE_CONFIG_KEY = 'site';
const legacySiteConfigPath = path.join(process.cwd(), 'server', 'data', 'site-config.json');

type SiteConfigData = {
    logoUrl: string;
    siteName: string;
    logoSize: number;
    faviconUrl: string;
    startupLoaderEnabled: boolean;
    startupLoaderImageUrl: string;
    startupLoaderBackground: string;
    primaryColor: string;
    heroSlides: unknown[];
    heroPromoBanners: unknown[];
    floatingBrandCards: unknown[];
    heroSlideHeight: number;
    coverBackgroundUrl: string;
    coverListingIds: string[];
    storeSections: Array<{ id: string; enabled: boolean; order?: number }>;
    accentColor: string;
    accentHoverColor: string;
    accentSoftColor: string;
    accentTextColor: string;
    fontFamily: string;
    customFonts?: Array<{ id: string; name: string; family: string; dataUrl: string; format: string }>;
    headerAnnouncement: string;
    headerSearchPlaceholder: string;
    headerCtaLabel: string;
    footerTagline: string;
    footerDescription: string;
    footerEmail: string;
    footerPhone: string;
    footerWhatsapp: string;
    footerAddress: string;
    footerCopyright: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    seoCanonicalUrl: string;
    seoOgImageUrl: string;
    seoRobots: string;
    seoSitemapEnabled: boolean;
    seoOrganizationName: string;
    seoGoogleAnalyticsId: string;
    seoGoogleAdsConversionId: string;
    seoFacebookPixelId: string;
    smtpMailerName: string;
    smtpHost: string;
    smtpDriver: string;
    smtpPort: string;
    smtpUsername: string;
    smtpEmailId: string;
    smtpEncryption: string;
    smtpPassword: string;
    emailTemplates?: Record<string, { subject: string; html: string }>;
    adminNotificationsEnabled: boolean;
    adminNotificationSound: boolean;
    adminNotificationPollSeconds: number;
    whatsappNotificationsEnabled: boolean;
    whatsappNotificationWebhookUrl: string;
    telegramNotificationsEnabled: boolean;
    telegramBotToken: string;
    telegramChatId: string;
    messengerNotificationsEnabled: boolean;
    messengerNotificationWebhookUrl: string;
    click2payEnabled: boolean;
    click2payMerchantId: string;
    click2payApiKey: string;
    authProviders?: Record<string, { enabled: boolean; lastUpdatedAt?: string }>;
};

const defaultSiteConfig: SiteConfigData = {
    logoUrl: '',
    siteName: 'TuniBots',
    logoSize: 32,
    faviconUrl: '',
    startupLoaderEnabled: false,
    startupLoaderImageUrl: '',
    startupLoaderBackground: '#020617',
    primaryColor: '',
    heroSlides: [],
    heroPromoBanners: [],
    floatingBrandCards: [],
    heroSlideHeight: 440,
    coverBackgroundUrl: '',
    coverListingIds: [],
    storeSections: [
        { id: 'store-cover', enabled: true, order: 10 },
        { id: 'hero-slider', enabled: true, order: 20 },
        { id: 'floating-brand-cards', enabled: true, order: 25 },
        { id: 'collections', enabled: true, order: 30 },
        { id: 'packages', enabled: true, order: 40 },
        { id: 'top-products', enabled: true, order: 50 },
        { id: 'gift-cards', enabled: true, order: 60 },
        { id: 'trending', enabled: true, order: 70 },
        { id: 'discounts', enabled: true, order: 80 },
        { id: 'trust-badges', enabled: true, order: 90 }
    ],
    accentColor: '#4f46e5',
    accentHoverColor: '#4338ca',
    accentSoftColor: '#e0e7ff',
    accentTextColor: '#312e81',
    fontFamily: '"Albeit Grotesk Caps", "Albeit Grotesk", "Arial Narrow", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    customFonts: [],
    headerAnnouncement: 'Bienvenue sur la première plateforme digitale en Tunisie !',
    headerSearchPlaceholder: 'Rechercher jeux, items, comptes...',
    headerCtaLabel: "S'inscrire",
    footerTagline: 'Marketplace digitale premium',
    footerDescription: 'La destination premium pour vos comptes, licences, abonnements, outils IA et services digitaux en Tunisie.',
    footerEmail: 'support@tunibots.tn',
    footerPhone: '+216 00 000 000',
    footerWhatsapp: '+216 00 000 000',
    footerAddress: 'Tunis, Tunisie',
    footerCopyright: 'Tous droits réservés.',
    seoTitle: 'TuniBots | Marketplace digitale en Tunisie',
    seoDescription: 'Achetez des produits digitaux, comptes, licences, abonnements et services numériques en Tunisie avec livraison rapide et support local.',
    seoKeywords: 'marketplace digitale tunisie, comptes gaming, abonnements, licences, services digitaux, TuniBots',
    seoCanonicalUrl: '',
    seoOgImageUrl: '',
    seoRobots: 'index,follow',
    seoSitemapEnabled: true,
    seoOrganizationName: 'TuniBots',
    seoGoogleAnalyticsId: '',
    seoGoogleAdsConversionId: '',
    seoFacebookPixelId: '',
    smtpMailerName: '',
    smtpHost: '',
    smtpDriver: 'smtp',
    smtpPort: '',
    smtpUsername: '',
    smtpEmailId: '',
    smtpEncryption: 'tls',
    smtpPassword: '',
    emailTemplates: DEFAULT_EMAIL_TEMPLATES,
    adminNotificationsEnabled: true,
    adminNotificationSound: true,
    adminNotificationPollSeconds: 15,
    whatsappNotificationsEnabled: false,
    whatsappNotificationWebhookUrl: '',
    telegramNotificationsEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    messengerNotificationsEnabled: false,
    messengerNotificationWebhookUrl: '',
    click2payEnabled: false,
    click2payMerchantId: '',
    click2payApiKey: '',
    authProviders: {}
};

const asInputJson = (value: SiteConfigData): Prisma.InputJsonValue => {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const mergeSiteConfig = (value: unknown): SiteConfigData => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ...defaultSiteConfig };
    }

    return {
        ...defaultSiteConfig,
        ...(value as Partial<SiteConfigData>)
    };
};

const loadInitialSiteConfig = async () => {
    try {
        const raw = await fs.readFile(legacySiteConfigPath, 'utf8');
        return mergeSiteConfig(JSON.parse(raw));
    } catch {
        return { ...defaultSiteConfig };
    }
};

const estimateBase64Size = (value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith('data:')) return 0;
    const base64 = value.split(',')[1] || '';
    return Math.floor((base64.length * 3) / 4);
};

export const readSiteConfig = async () => {
    const record = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });

    if (record) {
        return mergeSiteConfig(record.data);
    }

    const initialConfig = await loadInitialSiteConfig();
    const created = await prisma.siteConfig.create({
        data: {
            key: SITE_CONFIG_KEY,
            data: asInputJson(initialConfig)
        }
    });

    return mergeSiteConfig(created.data);
};

export const writeSiteConfig = async (config: SiteConfigData) => {
    await prisma.siteConfig.upsert({
        where: { key: SITE_CONFIG_KEY },
        create: {
            key: SITE_CONFIG_KEY,
            data: asInputJson(config)
        },
        update: {
            data: asInputJson(config)
        }
    });
};

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Administrative functions
 *   - name: Users
 *     description: User management
 *   - name: Config
 *     description: Site configuration
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard statistics
 */
export const getStats = async (_req: Request, res: Response) => {
    const dailyStats = await prisma.dailyStat.findMany({ orderBy: { date: 'asc' }, take: 30 });
    const topProducts = await prisma.listing.findMany({ orderBy: { salesCount: 'desc' }, take: 5 });
    res.json({
        totalSales: (await prisma.order.aggregate({ _sum: { amount: true } }))._sum.amount || 0,
        totalOrders: await prisma.order.count(),
        totalUsers: await prisma.user.count(),
        dailyStats, topProducts
    });
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
export const getAllUsers = async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map((u: { password?: string }) => { const r = { ...u }; delete r.password; return r; }));
};

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get site configuration
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Site configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteConfig'
 */
export const getSiteConfig = async (_req: Request, res: Response) => {
    console.log('[site-config] GET /api/config');
    res.json(await readSiteConfig());
};

/**
 * @swagger
 * /api/config:
 *   patch:
 *     summary: Update site configuration
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteConfig'
 *     responses:
 *       200:
 *         description: Site configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteConfig'
 */
export const updateSiteConfig = async (req: Request, res: Response) => {
    const logoBytes = estimateBase64Size(req.body.logoUrl);
    const faviconBytes = estimateBase64Size(req.body.faviconUrl);
    console.log(
        `[site-config] PATCH /api/config keys=${Object.keys(req.body || {}).join(',')} logoBytes=${logoBytes} faviconBytes=${faviconBytes} siteName=${req.body.siteName || ''}`
    );

    const currentConfig = await readSiteConfig();
    const nextConfig = {
        ...currentConfig,
        ...req.body,
        click2payEnabled: Boolean(req.body.click2payEnabled ?? currentConfig.click2payEnabled)
    };

    await writeSiteConfig(nextConfig);
    console.log('[site-config] PATCH /api/config success');
    res.json(nextConfig);
};

export const sendTestEmail = async (req: Request, res: Response) => {
    const to = typeof req.body?.to === 'string' ? req.body.to.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ error: 'Adresse email de test invalide.' });
    }

    const template = await getEmailTemplate('testEmail');
    const sent = await sendEmail(
        to,
        renderTemplate(template.subject, {}),
        renderTemplate(template.html, {})
    );

    res.json({ success: true, message: 'Email de test envoyé.', messageId: sent.messageId });
};

export const resendOrderInvoiceEmail = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const result = await resendOrderConfirmationEmail(req.params.id);
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
            items: true,
            invoice: true,
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            }
        }
    });

    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'EMAIL_RESENT', ...requestMeta(req), metadata: { type: 'invoice', status: result.status } }
    });
    res.json({ ...order, emailStatus: result.status, emailError: result.error });
};

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User role updated
 */
const sanitizeUser = <T extends { password?: string }>(user: T) => {
    const result = { ...user };
    delete result.password;
    return result;
};

const requestMeta = (req: Request) => ({
    ipAddress: (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || req.socket.remoteAddress || '').trim(),
    userAgent: req.headers['user-agent'] || ''
});

const getActor = (req: Request & { user?: { id?: string; role?: string } }) => ({
    actorType: req.user?.role === 'ADMIN' ? 'ADMIN' : 'AGENT',
    actorId: req.user?.id || null
});

const serializeAdminOrder = (order: any) => ({
    ...order,
    buyerId: order.userId || order.id,
    buyer: order.user,
    buyerDisplayName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
    deliveries: (order.deliveries || []).map(({ deliveryContentEncrypted, ...delivery }: any) => delivery)
});

export const updateUserRole = async (req: Request, res: Response) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
};

export const updateUserBalance = async (req: Request, res: Response) => {
    const balance = Number(req.body.balance);
    if (!Number.isFinite(balance)) return res.status(400).json({ error: 'Balance invalide' });

    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { balance }
    });

    res.json(sanitizeUser(user));
};

export const getAllOrders = async (_req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        include: {
            items: true,
            invoice: true,
            payments: true,
            deliveries: true,
            actionLogs: { orderBy: { createdAt: 'asc' } },
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(orders.map(serializeAdminOrder));
};

export const updateOrderStatus = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const previousOrder = await prisma.order.findUnique({
        where: { id: req.params.id },
        select: { status: true }
    });

    const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
            status: req.body.status,
            paymentConfirmedAt: ['IN_PROGRESS', 'PAYMENT_RECEIVED', 'DELIVERED', 'COMPLETED'].includes(req.body.status) ? new Date() : undefined
        },
        include: {
            items: true,
            invoice: true,
            payments: true,
            deliveries: true,
            actionLogs: { orderBy: { createdAt: 'asc' } },
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            }
        }
    });

    await prisma.orderActionLog.create({
        data: {
            orderId: order.id,
            ...getActor(req),
            action: 'ORDER_STATUS_UPDATED',
            ...requestMeta(req),
            metadata: { status: req.body.status }
        }
    });
    await notifyClientOrderStatus({ orderId: order.id, status: order.status, previousStatus: previousOrder?.status || null });

    res.json(serializeAdminOrder(order));
};

export const approveOrderPayment = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
            status: 'PAYMENT_APPROVED',
            paymentConfirmedAt: new Date(),
            payments: {
                updateMany: {
                    where: { status: { in: ['PENDING', 'SUBMITTED'] } },
                    data: {
                        status: 'APPROVED',
                        approvedAt: new Date(),
                        reviewedBy: req.user?.id || null,
                        paidAt: new Date()
                    }
                }
            },
            invoice: { update: { status: 'PAID' } }
        },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });

    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'PAYMENT_APPROVED', ...requestMeta(req), metadata: { reviewedBy: req.user?.id || null } }
    });
    await notifyClientOrderStatus({ orderId: order.id, status: order.status });
    await sendPaymentApprovedEmail(order);
    res.json(serializeAdminOrder(order));
};

export const rejectOrderPayment = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const reason = typeof req.body.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim() : 'Paiement rejete.';
    const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
            status: 'PAYMENT_REJECTED',
            payments: {
                updateMany: {
                    where: { status: { in: ['PENDING', 'SUBMITTED'] } },
                    data: { status: 'REJECTED', rejectedAt: new Date(), reviewedBy: req.user?.id || null, rejectionReason: reason }
                }
            },
            invoice: { update: { status: 'PAYMENT_REJECTED' } }
        },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });

    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'PAYMENT_REJECTED', ...requestMeta(req), metadata: { reason } }
    });
    await notifyClientOrderStatus({ orderId: order.id, status: order.status });
    res.json(serializeAdminOrder(order));
};

export const createOrderDelivery = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const content = typeof req.body.deliveryContent === 'string' ? req.body.deliveryContent.trim() : '';
    if (!content) return res.status(400).json({ error: 'Le contenu de livraison est obligatoire.' });

    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: true } });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (!order.payments.some((payment) => payment.status === 'APPROVED')) {
        return res.status(400).json({ error: 'Le paiement doit etre approuve avant de preparer la livraison.' });
    }

    const delivery = await prisma.delivery.create({
        data: {
            orderId: order.id,
            orderItemId: req.body.orderItemId || null,
            status: 'READY',
            deliveryContentEncrypted: encryptDeliveryContent(content),
            deliveryType: req.body.deliveryType || 'MIXED',
            activationGuide: req.body.activationGuide || null,
            restrictions: req.body.restrictions || null,
            region: req.body.region || null
        }
    });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'IN_DELIVERY' } });
    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'DELIVERY_CREATED', ...requestMeta(req), metadata: { deliveryId: delivery.id, orderItemId: req.body.orderItemId || null } }
    });
    await notifyClientOrderStatus({ orderId: order.id, status: 'IN_DELIVERY', previousStatus: order.status });

    const updated = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    res.status(201).json(serializeAdminOrder(updated));
};

export const sendOrderDelivery = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (!order.payments.some((payment) => payment.status === 'APPROVED')) return res.status(400).json({ error: 'Paiement non approuve.' });
    if (!order.deliveries.some((delivery) => delivery.status === 'READY' || delivery.status === 'LOCKED')) return res.status(400).json({ error: 'Aucun contenu de livraison pret.' });

    await prisma.delivery.updateMany({
        where: { orderId: order.id, status: { in: ['READY', 'LOCKED'] } },
        data: { status: 'SENT', sentAt: new Date(), sentBy: req.user?.id || null }
    });
    const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'DELIVERED' },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });

    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'DELIVERY_SENT', ...requestMeta(req), metadata: { deliveryCount: updated.deliveries.length } }
    });
    await notifyClientOrderStatus({ orderId: updated.id, status: updated.status, previousStatus: order.status });

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
    res.json(serializeAdminOrder(updated));
};

export const resendOrderDeliveryEmail = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true, invoice: true, payments: true, deliveries: true, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    const sentDeliveries = order.deliveries.filter((delivery) => delivery.status === 'SENT' || delivery.status === 'VIEWED');
    if (sentDeliveries.length === 0) return res.status(400).json({ error: 'Aucune livraison envoyee a renvoyer.' });

    if (sentDeliveries.some((delivery) => delivery.resendCount >= 3)) return res.status(429).json({ error: 'Limite de renvoi email atteinte pour cette commande.' });

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
    await prisma.delivery.updateMany({ where: { orderId: order.id, id: { in: sentDeliveries.map((delivery) => delivery.id) } }, data: { resendCount: { increment: 1 } } });
    await prisma.orderActionLog.create({
        data: { orderId: order.id, ...getActor(req), action: 'EMAIL_RESENT', ...requestMeta(req), metadata: { type: 'delivery' } }
    });

    const updated = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, invoice: true, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    res.json(serializeAdminOrder(updated));
};

export const sendClientNotification = async (req: Request & { user?: { id?: string; role?: string } }, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const targetUserIds = Array.isArray(req.body?.targetUserIds)
        ? req.body.targetUserIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

    if (!title) return res.status(400).json({ error: 'Le titre de la notification est obligatoire.' });
    if (!message) return res.status(400).json({ error: 'Le message de la notification est obligatoire.' });

    const result = await sendCustomClientNotification({
        title,
        message,
        targetUserIds,
        actorId: req.user?.id || null
    });

    res.status(201).json({
        success: true,
        recipients: result.recipients,
        message: result.recipients > 0
            ? `Notification envoyee a ${result.recipients} client(s).`
            : 'Aucun client correspondant pour cette notification.'
    });
};

const variantString = (variants: Array<{ name: string; price: number; order: number }>) =>
    variants.map((variant) => `${variant.name}|${variant.price}|${variant.order}`).join('; ');

const parseVariantString = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return [];
    return value.split(';')
        .map((entry, index) => {
            const [name, price, order] = entry.split('|').map((part) => part?.trim());
            const parsedPrice = Number(price);
            const parsedOrder = Number(order);
            if (!name || !Number.isFinite(parsedPrice)) return null;
            return { name, price: parsedPrice, order: Number.isInteger(parsedOrder) ? parsedOrder : index + 1 };
        })
        .filter((entry): entry is { name: string; price: number; order: number } => Boolean(entry));
};

const cellText = (value: ExcelJS.CellValue) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && 'text' in value) return String(value.text || '').trim();
    if (typeof value === 'object' && 'result' in value) return String(value.result || '').trim();
    return String(value).trim();
};

const readSheetRows = (worksheet?: ExcelJS.Worksheet) => {
    if (!worksheet) return [];
    const headers = (worksheet.getRow(1).values as ExcelJS.CellValue[])
        .slice(1)
        .map((value) => cellText(value));
    const rows: Record<string, string>[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as ExcelJS.CellValue[];
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
            record[header] = cellText(values[index + 1]);
        });
        if (Object.values(record).some(Boolean)) rows.push(record);
    });

    return rows;
};

const styleSheet = (worksheet: ExcelJS.Worksheet) => {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
    worksheet.columns.forEach((column) => {
        column.width = Math.min(Math.max((column.header?.toString().length || 12) + 4, 14), 42);
    });
};

export const exportSiteData = async (_req: Request, res: Response) => {
    const [categories, subCategories, listings] = await Promise.all([
        prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
        prisma.subCategory.findMany({ include: { category: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
        prisma.listing.findMany({
            include: {
                category: true,
                subCategory: true,
                variants: { orderBy: [{ order: 'asc' }, { price: 'asc' }] }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TuniBots Admin';
    workbook.created = new Date();

    const categorySheet = workbook.addWorksheet('Categories');
    categorySheet.columns = [
        { header: 'id', key: 'id' },
        { header: 'name', key: 'name' },
        { header: 'slug', key: 'slug' },
        { header: 'icon', key: 'icon' },
        { header: 'imageUrl', key: 'imageUrl' },
        { header: 'gradient', key: 'gradient' },
        { header: 'description', key: 'description' },
        { header: 'order', key: 'order' }
    ];
    categories.forEach((category) => categorySheet.addRow(category));
    styleSheet(categorySheet);

    const subCategorySheet = workbook.addWorksheet('SubCategories');
    subCategorySheet.columns = [
        { header: 'id', key: 'id' },
        { header: 'name', key: 'name' },
        { header: 'slug', key: 'slug' },
        { header: 'categoryId', key: 'categoryId' },
        { header: 'categorySlug', key: 'categorySlug' },
        { header: 'icon', key: 'icon' },
        { header: 'description', key: 'description' },
        { header: 'order', key: 'order' }
    ];
    subCategories.forEach((subCategory) => subCategorySheet.addRow({
        ...subCategory,
        categorySlug: subCategory.category.slug
    }));
    styleSheet(subCategorySheet);

    const productSheet = workbook.addWorksheet('Products');
    productSheet.columns = [
        { header: 'id', key: 'id' },
        { header: 'title', key: 'title' },
        { header: 'slug', key: 'slug' },
        { header: 'description', key: 'description' },
        { header: 'price', key: 'price' },
        { header: 'categoryId', key: 'categoryId' },
        { header: 'categorySlug', key: 'categorySlug' },
        { header: 'subCategoryId', key: 'subCategoryId' },
        { header: 'subCategorySlug', key: 'subCategorySlug' },
        { header: 'game', key: 'game' },
        { header: 'source', key: 'source' },
        { header: 'imageUrl', key: 'imageUrl' },
        { header: 'logoUrl', key: 'logoUrl' },
        { header: 'gallery', key: 'gallery' },
        { header: 'stock', key: 'stock' },
        { header: 'isInstant', key: 'isInstant' },
        { header: 'preparationTime', key: 'preparationTime' },
        { header: 'discountType', key: 'discountType' },
        { header: 'discountValue', key: 'discountValue' },
        { header: 'variantLabel', key: 'variantLabel' },
        { header: 'variants', key: 'variants' },
        { header: 'isArchived', key: 'isArchived' },
        { header: 'metaTitle', key: 'metaTitle' },
        { header: 'metaDesc', key: 'metaDesc' },
        { header: 'keywords', key: 'keywords' }
    ];
    listings.forEach((listing) => productSheet.addRow({
        ...listing,
        categorySlug: listing.category.slug,
        subCategorySlug: listing.subCategory?.slug || '',
        gallery: listing.gallery,
        variants: variantString(listing.variants)
    }));
    styleSheet(productSheet);

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tunibots-data-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(Buffer.from(buffer));
};

export const importSiteData = async (req: Request, res: Response) => {
    const rawFile = typeof req.body.fileBase64 === 'string' ? req.body.fileBase64 : '';
    if (!rawFile) return res.status(400).json({ error: 'Fichier Excel manquant.' });

    const base64 = rawFile.includes(',') ? rawFile.split(',').pop() || '' : rawFile;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(base64, 'base64'));

    const categoryRows = readSheetRows(workbook.getWorksheet('Categories'));
    const subCategoryRows = readSheetRows(workbook.getWorksheet('SubCategories'));
    const productRows = readSheetRows(workbook.getWorksheet('Products'));

    let categoriesImported = 0;
    let subCategoriesImported = 0;
    let productsImported = 0;

    for (const row of categoryRows) {
        if (!row.name || !row.slug) continue;
        await prisma.category.upsert({
            where: { slug: row.slug },
            create: {
                name: row.name,
                slug: row.slug,
                icon: row.icon || 'Package',
                imageUrl: row.imageUrl || null,
                gradient: row.gradient || null,
                description: row.description || null,
                order: Number(row.order) || 0
            },
            update: {
                name: row.name,
                icon: row.icon || 'Package',
                imageUrl: row.imageUrl || null,
                gradient: row.gradient || null,
                description: row.description || null,
                order: Number(row.order) || 0
            }
        });
        categoriesImported += 1;
    }

    for (const row of subCategoryRows) {
        if (!row.name || !row.slug) continue;
        const category = await prisma.category.findFirst({
            where: {
                OR: [
                    ...(row.categoryId ? [{ id: row.categoryId }] : []),
                    ...(row.categorySlug ? [{ slug: row.categorySlug }] : [])
                ]
            }
        });
        if (!category) continue;
        await prisma.subCategory.upsert({
            where: { slug: row.slug },
            create: {
                name: row.name,
                slug: row.slug,
                categoryId: category.id,
                icon: row.icon || 'Package',
                description: row.description || '',
                order: Number(row.order) || 0
            },
            update: {
                name: row.name,
                categoryId: category.id,
                icon: row.icon || 'Package',
                description: row.description || '',
                order: Number(row.order) || 0
            }
        });
        subCategoriesImported += 1;
    }

    for (const row of productRows) {
        if (!row.title) continue;
        const category = await prisma.category.findFirst({
            where: {
                OR: [
                    ...(row.categoryId ? [{ id: row.categoryId }] : []),
                    ...(row.categorySlug ? [{ slug: row.categorySlug }] : [])
                ]
            }
        });
        if (!category) continue;

        const subCategory = row.subCategoryId || row.subCategorySlug
            ? await prisma.subCategory.findFirst({
                where: {
                    OR: [
                        ...(row.subCategoryId ? [{ id: row.subCategoryId }] : []),
                        ...(row.subCategorySlug ? [{ slug: row.subCategorySlug }] : [])
                    ]
                }
            })
            : null;
        const variants = parseVariantString(row.variants);
        const slug = row.slug
            ? await buildUniqueProductSlugFromInput(row.slug, { fallback: row.title || row.game || null, excludeId: row.id || undefined })
            : await buildUniqueProductSlug(row.title, { fallback: row.game || null, excludeId: row.id || undefined });
        const data = {
            title: row.title,
            slug,
            description: row.description || '',
            price: Number(row.price) || 0,
            categoryId: category.id,
            subCategoryId: subCategory?.id || null,
            game: row.game || null,
            source: row.source || null,
            imageUrl: row.imageUrl || '',
            logoUrl: row.logoUrl || null,
            gallery: row.gallery || '[]',
            stock: Number(row.stock) || 0,
            isInstant: row.isInstant ? row.isInstant.toLowerCase() !== 'false' : true,
            preparationTime: row.preparationTime || 'Immédiat',
            deliveryTimeHours: 24,
            discountType: row.discountType || 'NONE',
            discountValue: Number(row.discountValue) || 0,
            discountPercent: row.discountType === 'PERCENT' ? Number(row.discountValue) || 0 : 0,
            variantLabel: variants.length > 0 ? (row.variantLabel || 'Variante') : null,
            isArchived: row.isArchived ? row.isArchived.toLowerCase() === 'true' : false,
            metaTitle: row.metaTitle || null,
            metaDesc: row.metaDesc || null,
            keywords: row.keywords || null
        };

        const existing = row.id ? await prisma.listing.findUnique({ where: { id: row.id } }) : null;
        if (existing) {
            await prisma.listing.update({
                where: { id: existing.id },
                data: {
                    ...data,
                    variants: {
                        deleteMany: {},
                        ...(variants.length > 0 ? { create: variants } : {})
                    }
                }
            });
        } else {
            await prisma.listing.create({
                data: {
                    ...data,
                    variants: variants.length > 0 ? { create: variants } : undefined
                }
            });
        }
        productsImported += 1;
    }

    res.json({ success: true, categoriesImported, subCategoriesImported, productsImported });
};

const cleanOrders = async (tx: Prisma.TransactionClient) => {
    await tx.invoiceItem.deleteMany({});
    await tx.invoice.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.loyaltyPoint.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.order.deleteMany({});
    await tx.dailyStat.deleteMany({});
};

const cleanProducts = async (tx: Prisma.TransactionClient) => {
    await cleanOrders(tx);
    await tx.cartItem.deleteMany({});
    await tx.packageItem.deleteMany({});
    await tx.productVariant.deleteMany({});
    await tx.listing.deleteMany({});
};

const cleanCategories = async (tx: Prisma.TransactionClient) => {
    await cleanProducts(tx);
    await tx.subCategory.deleteMany({});
    await tx.category.deleteMany({});
};

export const cleanSiteData = async (req: Request, res: Response) => {
    const table = String(req.body.table || '');
    const confirmation = String(req.body.confirmation || '');
    if (confirmation !== 'CONFIRM CLEAN') {
        return res.status(400).json({ error: 'Confirmation invalide. Tapez CONFIRM CLEAN.' });
    }

    const before = {
        categories: await prisma.category.count(),
        subCategories: await prisma.subCategory.count(),
        products: await prisma.listing.count(),
        orders: await prisma.order.count(),
        users: await prisma.user.count()
    };

    await prisma.$transaction(async (tx) => {
        if (table === 'orders') {
            await cleanOrders(tx);
        } else if (table === 'products') {
            await cleanProducts(tx);
        } else if (table === 'categories') {
            await cleanCategories(tx);
        } else if (table === 'users') {
            await cleanOrders(tx);
            await tx.cartItem.deleteMany({});
            await tx.cart.deleteMany({});
            await tx.user.deleteMany({ where: { role: { notIn: ['ADMIN', 'SUB_ADMIN', 'SELLER', 'AGENT'] } } });
        } else if (table === 'all') {
            await cleanCategories(tx);
            await tx.cartItem.deleteMany({});
            await tx.cart.deleteMany({});
            await tx.sequence.deleteMany({});
            await tx.user.deleteMany({ where: { role: { notIn: ['ADMIN', 'SUB_ADMIN', 'SELLER', 'AGENT'] } } });
        } else {
            throw new Error('Table non supportée.');
        }
    });

    const after = {
        categories: await prisma.category.count(),
        subCategories: await prisma.subCategory.count(),
        products: await prisma.listing.count(),
        orders: await prisma.order.count(),
        users: await prisma.user.count()
    };

    res.json({ success: true, table, before, after });
};
