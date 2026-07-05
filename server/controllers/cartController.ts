
import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma.js';
import { clearUserCart, createCheckoutOrder, submitPaymentProofForOrder } from '../services/checkoutService.js';
import { validateCouponForSubtotal } from '../services/couponService.js';
import { getOrderStatusNotificationContent, notifyClientOrderStatus } from '../services/clientNotificationService.js';
import { notifyStaff } from '../services/notificationService.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../services/orderEmailService.js';
import { notifyNewOrder } from '../services/orderNotificationService.js';
import { decryptDeliveryContent } from '../services/deliverySecurityService.js';
import { sendWhatsappWebhookEvent } from '../services/whatsappBotService.js';
import { assertInvoiceAccess, generateInvoicePdfBufferForOrder, getInvoiceOrderById } from '../services/invoicePdfService.js';
import logger from '../logger.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const serializeOrder = <T extends {
    id: string;
    userId: string | null;
    user?: { id: string; username: string; email: string; avatarUrl: string } | null;
    items: Array<{
        id: string;
        listingId: string;
        quantity: number;
        priceSnapshot: number;
        titleSnapshot: string;
    }>;
    invoice?: {
        id: string;
        invoiceNumber: string;
        type: string;
        status: string;
        issueDate: Date;
        totalAmount: number;
    } | null;
    payments?: Array<Record<string, unknown>>;
    deliveries?: Array<Record<string, unknown>>;
    actionLogs?: Array<Record<string, unknown>>;
    [key: string]: unknown;
}>(order: T) => {
    const buyerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ').trim();
    return {
        ...order,
        buyerId: order.userId || order.id,
        buyer: order.user || null,
        buyerDisplayName: buyerName,
        invoice: order.invoice || null,
        deliveries: (order.deliveries || []).map((delivery) => {
            const nextDelivery = { ...delivery };
            delete (nextDelivery as { deliveryContentEncrypted?: unknown }).deliveryContentEncrypted;
            return nextDelivery;
        }),
        actionLogs: order.actionLogs || []
    };
};

const requestMeta = (req: Request) => ({
    ipAddress: (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || req.socket.remoteAddress || '').trim(),
    userAgent: req.headers['user-agent'] || ''
});

const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const logNotificationFailure = (event: string, error: unknown, details: Record<string, unknown>) => {
    logger.error({ event, ...details, err: error }, 'notification_event_failed');
};

const buildOrderStatusHistory = (order: {
    createdAt: Date;
    status: string;
    paymentConfirmedAt?: Date | null;
    deliveries?: Array<{ sentAt?: Date | null }>;
    actionLogs?: Array<{ action: string; createdAt: Date; metadata?: Record<string, unknown> | null }>;
}) => {
    const actionLogs = order.actionLogs || [];
    const paymentLog = actionLogs.find((log) =>
        log.action === 'PAYMENT_PROOF_SUBMITTED'
        || log.action === 'PAYMENT_APPROVED'
        || (log.action === 'ORDER_STATUS_UPDATED' && ['PAYMENT_RECEIVED', 'PAYMENT_APPROVED', 'PAID'].includes(String((log.metadata as any)?.status || '')))
    );
    const deliveryLog = actionLogs.find((log) => log.action === 'DELIVERY_SENT');

    const entries = [
        {
            key: 'received',
            label: 'Commande recue',
            status: order.status,
            state: 'done',
            happenedAt: order.createdAt,
            description: 'Votre commande a ete enregistree et attend le traitement du paiement.'
        },
        {
            key: 'payment_verified',
            label: 'Paiement verifie',
            status: ['PAYMENT_RECEIVED', 'PAYMENT_APPROVED', 'PAID', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? order.status : 'PENDING',
            state: ['PAYMENT_RECEIVED', 'PAYMENT_APPROVED', 'PAID', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status)
                ? 'done'
                : ['PAYMENT_UNDER_REVIEW', 'PENDING_PAYMENT', 'PAYMENT_REJECTED', 'CANCELLED', 'REFUNDED'].includes(order.status)
                    ? 'current'
                    : 'upcoming',
            happenedAt: paymentLog?.createdAt || order.paymentConfirmedAt || null,
            description: 'Verification manuelle du paiement par notre equipe.'
        },
        {
            key: 'delivered',
            label: 'Commande livree',
            status: ['DELIVERED', 'COMPLETED'].includes(order.status) ? order.status : 'PENDING',
            state: ['DELIVERED', 'COMPLETED'].includes(order.status) ? 'done' : ['IN_DELIVERY', 'PAID', 'PAYMENT_APPROVED'].includes(order.status) ? 'current' : 'upcoming',
            happenedAt: deliveryLog?.createdAt || order.deliveries?.find((delivery) => delivery.sentAt)?.sentAt || null,
            description: 'Votre contenu digital est pret et accessible.'
        }
    ];

    return entries;
};

const serializeTrackedOrder = (order: any) => ({
    ...serializeOrder(order),
    statusHistory: buildOrderStatusHistory(order)
});

/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: Shopping cart operations
 *   - name: Orders
 *     description: Order processing
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CartItem'
 */
export const getCart = async (req: AuthRequest, res: Response) => {
    const cart = await prisma.cart.findUnique({
        where: { userId: req.user?.id },
        include: {
            items: {
                include: {
                    variant: true,
                    listing: {
                        include: {
                            variants: { orderBy: [{ order: 'asc' }, { price: 'asc' }] }
                        }
                    }
                }
            }
        }
    });
    res.json(cart?.items || []);
};

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add a product to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId]
 *             properties:
 *               listingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Added to cart
 */
export const addToCart = async (req: AuthRequest, res: Response) => {
    const { listingId, variantId } = req.body;
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { variants: true }
    });
    if (!listing || listing.isArchived) return res.status(404).json({ error: 'Produit introuvable.' });
    if (listing.variants.length > 0) {
        const selectedVariant = listing.variants.find((variant) => variant.id === variantId);
        if (!selectedVariant) return res.status(400).json({ error: 'Veuillez choisir une variante.' });
    }
    let cart = await prisma.cart.findUnique({ where: { userId: req.user?.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user?.id } });
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, listingId, variantId: variantId || null } });
    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
    else await prisma.cartItem.create({ data: { cartId: cart.id, listingId, variantId: variantId || null, quantity: 1 } });
    res.json({ success: true });
};

/**
 * @swagger
 * /api/cart/{itemId}:
 *   delete:
 *     summary: Remove an item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart item removed
 */
export const removeFromCart = async (req: Request, res: Response) => { 
    await prisma.cartItem.delete({ where: { id: req.params.itemId } }); 
    res.json({ success: true }); 
};

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     summary: Checkout current cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order created
 */
export const checkout = async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const cart = await prisma.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Votre panier est vide.' });

    try {
        const order = await createCheckoutOrder({
            firstName: user.fullName?.split(' ')[0] || user.username || 'Client',
            lastName: user.fullName?.split(' ').slice(1).join(' ') || user.username || 'TuniBots',
            email: user.email,
            phone: user.phone || req.body.phone || '+216',
            paymentMethod: req.body.paymentMethod,
            useLoyaltyPoints: req.body.useLoyaltyPoints,
            couponCode: req.body.couponCode,
            customerReference: req.body.customerReference,
            paymentProof: req.body.paymentProof,
            idempotencyKey: req.body.idempotencyKey || req.headers['idempotency-key']?.toString(),
            items: cart.items.map((item) => ({ listingId: item.listingId, variantId: item.variantId || undefined, quantity: item.quantity })),
            userId: user.id,
            source: 'AUTHENTICATED',
            ...requestMeta(req)
        });

        await clearUserCart(user.id);
        await notifyNewOrder(order);
        try {
            await notifyStaff({
                type: 'ORDER_CREATED',
                title: 'Nouvelle commande a traiter',
                message: `La commande ${order.orderNumber} vient d'etre creee et attend un traitement.`,
                metadata: {
                    orderNumber: order.orderNumber,
                    amount: order.amount,
                    currency: order.currency,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone
                },
                orderId: order.id,
                targetTab: 'orders',
                dedupeKey: `ORDER_CREATED:${order.id}`
            });
        } catch (error) {
            logNotificationFailure('ORDER_CREATED', error, { orderId: order.id, source: 'checkout' });
        }
        await notifyClientOrderStatus({ orderId: order.id, status: order.status });
        const emailResult = await sendOrderConfirmationEmail(order);
        res.json(serializeOrder({ ...order, emailStatus: emailResult.status, emailError: emailResult.error }));
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de créer la commande.' });
    }
};

export const guestCheckout = async (req: Request, res: Response) => {
    try {
        const order = await createCheckoutOrder({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            paymentMethod: req.body.paymentMethod,
            useLoyaltyPoints: req.body.useLoyaltyPoints,
            couponCode: req.body.couponCode,
            customerReference: req.body.customerReference,
            paymentProof: req.body.paymentProof,
            idempotencyKey: req.body.idempotencyKey || req.headers['idempotency-key']?.toString(),
            items: req.body.items,
            ...requestMeta(req)
        });

        await notifyNewOrder(order);
        try {
            await notifyStaff({
                type: 'ORDER_CREATED',
                title: 'Nouvelle commande a traiter',
                message: `La commande ${order.orderNumber} vient d'etre creee et attend un traitement.`,
                metadata: {
                    orderNumber: order.orderNumber,
                    amount: order.amount,
                    currency: order.currency,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone
                },
                orderId: order.id,
                targetTab: 'orders',
                dedupeKey: `ORDER_CREATED:${order.id}`
            });
        } catch (error) {
            logNotificationFailure('ORDER_CREATED', error, { orderId: order.id, source: 'guestCheckout' });
        }
        await notifyClientOrderStatus({ orderId: order.id, status: order.status });
        const emailResult = await sendOrderConfirmationEmail(order);
        res.status(201).json(serializeOrder({ ...order, emailStatus: emailResult.status, emailError: emailResult.error }));
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de créer la commande.' });
    }
};

export const confirmCheckout = async (req: AuthRequest, res: Response) => {
    try {
        const isAuthenticated = Boolean(req.user?.id);
        let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null;
        let items = req.body.items;

        if (isAuthenticated) {
            user = await prisma.user.findUnique({ where: { id: req.user?.id } });
            if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
            const cart = await prisma.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
            if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Votre panier est vide.' });
            items = cart.items.map((item) => ({ listingId: item.listingId, variantId: item.variantId || undefined, quantity: item.quantity }));
        }

        const order = await createCheckoutOrder({
            firstName: req.body.firstName || user?.fullName?.split(' ')[0] || user?.username,
            lastName: req.body.lastName || user?.fullName?.split(' ').slice(1).join(' ') || user?.username,
            email: req.body.email || user?.email || '',
            phone: req.body.phone || user?.phone || '',
            paymentMethod: req.body.paymentMethod,
            useLoyaltyPoints: req.body.useLoyaltyPoints,
            couponCode: req.body.couponCode,
            customerReference: req.body.customerReference,
            paymentProof: req.body.paymentProof,
            idempotencyKey: req.body.idempotencyKey || req.headers['idempotency-key']?.toString(),
            items,
            userId: user?.id,
            source: user ? 'AUTHENTICATED' : 'GUEST',
            ...requestMeta(req)
        });

        if (user) await clearUserCart(user.id);
        await notifyNewOrder(order);
        try {
            await notifyStaff({
                type: 'ORDER_CREATED',
                title: 'Nouvelle commande a traiter',
                message: `La commande ${order.orderNumber} vient d'etre creee et attend un traitement.`,
                metadata: {
                    orderNumber: order.orderNumber,
                    amount: order.amount,
                    currency: order.currency,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone
                },
                orderId: order.id,
                targetTab: 'orders',
                dedupeKey: `ORDER_CREATED:${order.id}`
            });
        } catch (error) {
            logNotificationFailure('ORDER_CREATED', error, { orderId: order.id, source: 'confirmCheckout' });
        }
        await notifyClientOrderStatus({ orderId: order.id, status: order.status });
        const emailResult = await sendOrderConfirmationEmail(order);
        res.status(201).json(serializeOrder({ ...order, emailStatus: emailResult.status, emailError: emailResult.error }));
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de créer la commande.' });
    }
};

export const validateCheckoutCoupon = async (req: Request, res: Response) => {
    try {
        const result = await validateCouponForSubtotal(req.body.couponCode, Number(req.body.subtotal || 0));
        res.json({
            valid: result.valid,
            code: result.code,
            type: result.type,
            value: result.value,
            subtotal: result.subtotal,
            discountAmount: result.discountAmount,
            finalSubtotal: result.finalSubtotal,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de valider ce code promo.' });
    }
};

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get current user orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of current user orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { userId: req.user?.id },
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

    const listingIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.listingId))));
    const reviews = listingIds.length > 0
        ? await prisma.review.findMany({
            where: {
                userId: req.user?.id,
                listingId: { in: listingIds }
            }
        })
        : [];

    const reviewByListingId = new Map(reviews.map((review) => [review.listingId, review]));

    res.json(orders.map((order) => serializeOrder({
        ...order,
        items: order.items.map((item) => ({
            ...item,
            review: reviewByListingId.get(item.listingId) || null
        }))
    })));
};

export const trackOrder = async (req: AuthRequest, res: Response) => {
    const orderNumber = req.params.orderNumber;
    const token = req.query.token?.toString();
    const email = req.query.email?.toString().trim().toLowerCase();

    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
            items: true,
            invoice: true,
            payments: true,
            deliveries: true,
            actionLogs: { orderBy: { createdAt: 'asc' } },
            user: { select: { id: true, username: true, email: true, avatarUrl: true } }
        }
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const ownerAllowed = req.user?.id && order.userId === req.user.id;
    const tokenAllowed = token && order.trackingTokenHash && hashToken(token) === order.trackingTokenHash;
    const emailAllowed = email && email === order.customerEmail.toLowerCase();
    if (!ownerAllowed && !tokenAllowed && !emailAllowed) {
        return res.status(403).json({ error: 'Verification requise pour consulter cette commande.' });
    }

    res.json(serializeTrackedOrder(order));
};

export const getOrderDelivery = async (req: AuthRequest, res: Response) => {
    const orderNumber = req.params.orderNumber;
    const token = req.query.token?.toString();
    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
            items: true,
            payments: true,
            deliveries: true
        }
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const ownerAllowed = req.user?.id && order.userId === req.user.id;
    const tokenAllowed = token && order.trackingTokenHash && hashToken(token) === order.trackingTokenHash;
    const paymentApproved = order.payments.some((payment) => payment.status === 'APPROVED' || payment.status === 'PAID');
    const canView = paymentApproved && order.status === 'DELIVERED' && order.deliveries.some((delivery) => delivery.status === 'SENT') && (ownerAllowed || tokenAllowed);

    if (!canView) return res.status(403).json({ error: 'La livraison est verrouillee jusqu’a validation et envoi.' });

    await prisma.delivery.updateMany({
        where: { orderId: order.id, status: 'SENT', viewedAt: null },
        data: { status: 'VIEWED', viewedAt: new Date() }
    });
    await prisma.orderActionLog.create({
        data: {
            orderId: order.id,
            actorType: ownerAllowed ? 'USER' : 'GUEST',
            actorId: ownerAllowed ? req.user?.id : null,
            action: 'DELIVERY_VIEWED',
            ...requestMeta(req),
            metadata: { orderNumber }
        }
    });

    res.json({
        orderNumber: order.orderNumber,
        deliveries: order.deliveries
            .filter((delivery) => delivery.status === 'SENT' || delivery.status === 'VIEWED')
            .map((delivery) => ({
                id: delivery.id,
                orderItemId: delivery.orderItemId,
                status: delivery.status,
                deliveryType: delivery.deliveryType,
                deliveryContent: decryptDeliveryContent(delivery.deliveryContentEncrypted),
                activationGuide: delivery.activationGuide,
                restrictions: delivery.restrictions,
                region: delivery.region,
                sentAt: delivery.sentAt,
                viewedAt: delivery.viewedAt
            }))
    });
};

export const downloadOrderInvoicePdf = async (req: AuthRequest, res: Response) => {
    try {
        const order = await getInvoiceOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

        try {
            assertInvoiceAccess(order, req.user || null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Acces refuse.';
            return res.status(message === 'Authentication required.' ? 401 : 403).json({ error: message });
        }

        const pdf = await generateInvoicePdfBufferForOrder(order.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
        res.send(pdf.buffer);
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de generer la facture.' });
    }
};

export const submitOrderPaymentProof = async (req: AuthRequest, res: Response) => {
    try {
        const order = await submitPaymentProofForOrder({
            orderNumber: req.params.orderNumber,
            email: req.body.email,
            userId: req.user?.id || null,
            reference: req.body.reference,
            proofUrl: req.body.proofUrl,
            paymentMethod: req.body.paymentMethod,
            proofMessage: req.body.proofMessage,
            ...requestMeta(req)
        });

        const payment = [...(order.payments || [])]
            .sort((a, b) => new Date(b.declaredAt || b.submittedAt || 0).getTime() - new Date(a.declaredAt || a.submittedAt || 0).getTime())[0];

        try {
            await notifyStaff({
                type: 'SYSTEM',
                title: 'Preuve de paiement recue',
                message: `La commande ${order.orderNumber} a recu une preuve de paiement et attend une verification manuelle.`,
                metadata: {
                    orderNumber: order.orderNumber,
                    amount: order.amount,
                    currency: order.currency,
                    paymentMethod: order.paymentMethod,
                    reference: payment?.reference || payment?.customerReference || null,
                    proofUrl: payment?.proofUrl || payment?.proofFileUrl || null,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone
                },
                orderId: order.id,
                targetTab: 'orders',
                dedupeKey: `PAYMENT_PROOF_SUBMITTED:${order.id}:${payment?.id || 'latest'}`
            });
        } catch (error) {
            logNotificationFailure('PAYMENT_PROOF_SUBMITTED', error, { orderId: order.id, source: 'submitOrderPaymentProof' });
        }

        try {
            const result = await sendWhatsappWebhookEvent({
                type: 'PAYMENT_PROOF_SUBMITTED',
                orderNumber: order.orderNumber,
                amount: order.amount,
                currency: order.currency,
                paymentMethod: order.paymentMethod,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                reference: payment?.reference || payment?.customerReference || null,
                proofUrl: payment?.proofUrl || payment?.proofFileUrl || null,
                message: `Commande ${order.orderNumber}, preuve de paiement recuee. Montant ${order.amount.toFixed(2)} ${order.currency}, methode ${order.paymentMethod || 'non precisee'}.`
            });

            if (result.status === 'FAILED') {
                logger.error({ orderId: order.id, orderNumber: order.orderNumber, error: result.error }, 'payment_proof_whatsapp_alert_failed');
            }
        } catch (error) {
            logger.error({ orderId: order.id, orderNumber: order.orderNumber, err: error }, 'payment_proof_whatsapp_alert_failed');
        }

        await notifyClientOrderStatus({ orderId: order.id, status: order.status });
        const statusContent = getOrderStatusNotificationContent(order.orderNumber, order.status);
        await sendOrderStatusUpdateEmail(order, order.status, statusContent.message);
        res.status(201).json(serializeOrder(order));
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible d envoyer la preuve de paiement.' });
    }
};
