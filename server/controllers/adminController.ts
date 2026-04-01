
import { Request, Response } from 'express';
import prisma from '../prisma.js';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative functions
 */

export const getStats = async (_req: Request, res: Response) => {
    if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
    const dailyStats = await prisma.dailyStat.findMany({ orderBy: { date: 'asc' }, take: 30 });
    const topProducts = await prisma.listing.findMany({ orderBy: { salesCount: 'desc' }, take: 5 });
    res.json({
        totalSales: (await prisma.order.aggregate({ _sum: { amount: true } }))._sum.amount || 0,
        totalOrders: await prisma.order.count(),
        totalUsers: await prisma.user.count(),
        dailyStats, topProducts
    });
};

export const getAllUsers = async (_req: Request, res: Response) => {
    if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map((u: { password?: string }) => { const r = { ...u }; delete r.password; return r; }));
};

export const updateUserRole = async (req: Request, res: Response) => {
    if (!prisma?.user) return res.status(500).json({ error: 'Prisma not initialized' });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const u = { ...user } as { password?: string };
    delete u.password;
    res.json(u);
};
