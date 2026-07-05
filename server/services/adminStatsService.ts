import prisma from '../prisma.js';

export const getDashboardStats = async () => {
  const dailyStats = await prisma.dailyStat.findMany({ orderBy: { date: 'asc' }, take: 30 });
  const topProducts = await prisma.listing.findMany({ orderBy: { salesCount: 'desc' }, take: 5 });

  return {
    totalSales: (await prisma.order.aggregate({ _sum: { amount: true } }))._sum.amount || 0,
    totalOrders: await prisma.order.count(),
    totalUsers: await prisma.user.count(),
    dailyStats,
    topProducts
  };
};
