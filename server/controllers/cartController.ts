
import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { sendEmail } from '../utils/email.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart operations
 * tags:
 *   name: Orders
 *   description: Order processing
 */

export const getCart = async (req: AuthRequest, res: Response) => {
    if (!prisma?.cart) return res.status(500).json({ error: 'Prisma not initialized' });
    const cart = await prisma.cart.findUnique({ where: { userId: req.user?.id }, include: { items: { include: { listing: true } } } });
    res.json(cart?.items || []);
};

export const addToCart = async (req: AuthRequest, res: Response) => {
    const { listingId } = req.body;
    if (!prisma?.cart) return res.status(500).json({ error: 'Prisma not initialized' });
    let cart = await prisma.cart.findUnique({ where: { userId: req.user?.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user?.id } });
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, listingId } });
    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
    else await prisma.cartItem.create({ data: { cartId: cart.id, listingId, quantity: 1 } });
    res.json({ success: true });
};

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
    if (!prisma?.cart) return res.status(500).json({ error: 'Prisma not initialized' });
    const cart = await prisma.cart.findUnique({ where: { userId: req.user?.id }, include: { items: { include: { listing: true } } } });
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: "Vide" });
    const total = cart.items.reduce((s: number, i: { listing: { price: number }, quantity: number }) => s + (i.listing.price * i.quantity), 0);
    const order = await prisma.order.create({
        data: { userId: req.user?.id, amount: total, items: { create: cart.items.map((i: { listingId: string, quantity: number, listing: { price: number, title: string } }) => ({ listingId: i.listingId, quantity: i.quantity, priceSnapshot: i.listing.price, titleSnapshot: i.listing.title })) } }, include: { items: true }
    });
    // Record Sale logic could go here
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await sendEmail(req.user?.email, `Commande #${order.id.slice(0, 8)}`, `<h1>Merci!</h1>Total: ${total} TND`);
    res.json(order);
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
    const orders = await prisma.order.findMany({ where: { userId: req.user?.id }, include: { items: true }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
};
