
import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { clearUserCart, createCheckoutOrder } from '../services/checkoutService.js';
import { sendOrderConfirmationEmail } from '../services/orderEmailService.js';

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
    [key: string]: unknown;
}>(order: T) => {
    const buyerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ').trim();
    return {
        ...order,
        buyerId: order.userId || order.id,
        buyer: order.user || null,
        buyerDisplayName: buyerName,
        invoice: order.invoice || null
    };
};

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
    const cart = await prisma.cart.findUnique({ where: { userId: req.user?.id }, include: { items: { include: { listing: true } } } });
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
    const { listingId } = req.body;
    let cart = await prisma.cart.findUnique({ where: { userId: req.user?.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user?.id } });
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, listingId } });
    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
    else await prisma.cartItem.create({ data: { cartId: cart.id, listingId, quantity: 1 } });
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
            lastName: user.fullName?.split(' ').slice(1).join(' ') || user.username || 'Tunidex',
            email: user.email,
            phone: user.phone || req.body.phone || '+216',
            paymentMethod: req.body.paymentMethod,
            items: cart.items.map((item) => ({ listingId: item.listingId, quantity: item.quantity })),
            userId: user.id,
            source: 'AUTHENTICATED'
        });

        await clearUserCart(user.id);
        await sendOrderConfirmationEmail(order);
        res.json(serializeOrder(order));
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
            items: req.body.items
        });

        await sendOrderConfirmationEmail(order);
        res.status(201).json(serializeOrder(order));
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de créer la commande.' });
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
    res.json(orders.map((order) => serializeOrder(order)));
};
