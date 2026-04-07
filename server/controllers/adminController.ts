
import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { promises as fs } from 'fs';
import path from 'path';

const siteConfigPath = path.join(process.cwd(), 'server', 'data', 'site-config.json');

const defaultSiteConfig = {
    logoUrl: '',
    siteName: 'Tunidex',
    faviconUrl: '',
    primaryColor: '',
    heroSlides: [],
    heroSlideHeight: 440,
    accentColor: '#4f46e5',
    accentHoverColor: '#4338ca',
    accentSoftColor: '#e0e7ff',
    accentTextColor: '#312e81',
    smtpMailerName: '',
    smtpHost: '',
    smtpDriver: 'smtp',
    smtpPort: '',
    smtpUsername: '',
    smtpEmailId: '',
    smtpEncryption: 'tls',
    smtpPassword: '',
    click2payEnabled: false,
    click2payMerchantId: '',
    click2payApiKey: ''
};

const estimateBase64Size = (value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith('data:')) return 0;
    const base64 = value.split(',')[1] || '';
    return Math.floor((base64.length * 3) / 4);
};

const readSiteConfig = async () => {
    try {
        const content = await fs.readFile(siteConfigPath, 'utf8');
        console.log(`[site-config] read ok path=${siteConfigPath} bytes=${Buffer.byteLength(content, 'utf8')}`);
        return { ...defaultSiteConfig, ...JSON.parse(content) };
    } catch (error) {
        console.warn(`[site-config] read fallback path=${siteConfigPath}`, error);
        await fs.mkdir(path.dirname(siteConfigPath), { recursive: true });
        await fs.writeFile(siteConfigPath, JSON.stringify(defaultSiteConfig, null, 2), 'utf8');
        console.log(`[site-config] initialized default config path=${siteConfigPath}`);
        return defaultSiteConfig;
    }
};

const writeSiteConfig = async (config: typeof defaultSiteConfig) => {
    await fs.mkdir(path.dirname(siteConfigPath), { recursive: true });
    const payload = JSON.stringify(config, null, 2);
    await fs.writeFile(siteConfigPath, payload, 'utf8');
    console.log(`[site-config] write ok path=${siteConfigPath} bytes=${Buffer.byteLength(payload, 'utf8')}`);
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
export const updateUserRole = async (req: Request, res: Response) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const u = { ...user } as { password?: string };
    delete u.password;
    res.json(u);
};

export const getAllOrders = async (_req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
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
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(orders.map((order) => ({
        ...order,
        buyerId: order.userId || order.id,
        buyer: order.user,
        buyerDisplayName: `${order.customerFirstName} ${order.customerLastName}`.trim()
    })));
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
            status: req.body.status,
            paymentConfirmedAt: req.body.status === 'PAYMENT_RECEIVED' ? new Date() : undefined
        },
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

    res.json({
        ...order,
        buyerId: order.userId || order.id,
        buyer: order.user,
        buyerDisplayName: `${order.customerFirstName} ${order.customerLastName}`.trim()
    });
};
