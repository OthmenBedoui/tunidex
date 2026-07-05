import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { readSiteConfig } from './siteConfigService.js';

export const LOYALTY_POINTS_PER_TND = 100;
export const LOYALTY_EARNED_TYPE = 'EARNED_DELIVERY';
export const LOYALTY_REDEEMED_TYPE = 'REDEEMED_CHECKOUT';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getConfig = async () => {
  const siteConfig = await readSiteConfig();
  return {
    pointsPerDinar: Math.max(0, Number(siteConfig.loyaltyPointsPerDinar || 0)),
    maxDiscountPercent: Math.max(0, Math.min(100, Number(siteConfig.loyaltyMaxDiscountPercent || 0)))
  };
};

export const getLoyaltyBalance = async (userId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) => {
  const result = await tx.loyaltyPoint.aggregate({
    where: { userId },
    _sum: { points: true }
  });

  return Math.max(0, result._sum.points || 0);
};

export const serializeLoyaltyPoint = (entry: {
  id: string;
  userId: string;
  orderId?: string | null;
  points: number;
  type: string;
  description?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
}) => ({
  id: entry.id,
  userId: entry.userId,
  orderId: entry.orderId || null,
  points: entry.points,
  type: entry.type,
  description: entry.description || null,
  expiresAt: entry.expiresAt || null,
  createdAt: entry.createdAt
});

export const getMyLoyaltySummary = async (userId: string) => {
  const [history, balance, config] = await Promise.all([
    prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    }),
    getLoyaltyBalance(userId),
    getConfig()
  ]);

  return {
    balance,
    redeemableAmount: roundMoney(balance / LOYALTY_POINTS_PER_TND),
    pointsPerDinar: config.pointsPerDinar,
    maxDiscountPercent: config.maxDiscountPercent,
    history: history.map(serializeLoyaltyPoint)
  };
};

export const computeLoyaltyRedemption = async (params: {
  userId?: string | null;
  subtotal: number;
  useLoyaltyPoints?: boolean;
  tx?: Prisma.TransactionClient;
}) => {
  const tx = params.tx || prisma;
  const config = await getConfig();

  if (!params.userId || !params.useLoyaltyPoints || config.maxDiscountPercent <= 0 || params.subtotal <= 0) {
    return {
      pointsUsed: 0,
      discountAmount: 0,
      maxDiscountAmount: 0,
      availableBalance: 0,
      pointsPerDinar: config.pointsPerDinar,
      maxDiscountPercent: config.maxDiscountPercent
    };
  }

  const availableBalance = await getLoyaltyBalance(params.userId, tx);
  const maxDiscountAmount = roundMoney((params.subtotal * config.maxDiscountPercent) / 100);
  const availableAmount = roundMoney(availableBalance / LOYALTY_POINTS_PER_TND);
  const discountAmount = roundMoney(Math.min(maxDiscountAmount, availableAmount));
  const pointsUsed = Math.min(availableBalance, Math.floor(discountAmount * LOYALTY_POINTS_PER_TND));

  return {
    pointsUsed,
    discountAmount: roundMoney(pointsUsed / LOYALTY_POINTS_PER_TND),
    maxDiscountAmount,
    availableBalance,
    pointsPerDinar: config.pointsPerDinar,
    maxDiscountPercent: config.maxDiscountPercent
  };
};

export const awardDeliveryLoyaltyPoints = async (
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    userId?: string | null;
    orderNumber: string;
    totalAmount: number;
  }
) => {
  if (!params.userId) return null;

  const { pointsPerDinar } = await getConfig();
  if (pointsPerDinar <= 0 || params.totalAmount <= 0) return null;

  const existing = await tx.loyaltyPoint.findFirst({
    where: {
      orderId: params.orderId,
      userId: params.userId,
      type: LOYALTY_EARNED_TYPE
    },
    select: { id: true }
  });

  if (existing) return null;

  const points = Math.max(0, Math.floor(params.totalAmount * pointsPerDinar));
  if (points <= 0) return null;

  return tx.loyaltyPoint.create({
    data: {
      userId: params.userId,
      orderId: params.orderId,
      points,
      type: LOYALTY_EARNED_TYPE,
      description: `Points credits apres livraison de la commande ${params.orderNumber}.`
    }
  });
};
