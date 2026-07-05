import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { HttpError } from './httpError.js';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const normalizeCouponCode = (value?: string | null) => (value || '').trim().toUpperCase();

const serializeCoupon = (coupon: {
  id: string;
  code: string;
  type: string;
  value: number;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  redemptions?: Array<{ discountAmount: number }>;
}) => ({
  id: coupon.id,
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  minAmount: coupon.minAmount ?? null,
  maxUses: coupon.maxUses ?? null,
  usedCount: coupon.usedCount,
  validFrom: coupon.validFrom ?? null,
  validTo: coupon.validTo ?? null,
  active: coupon.active,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
  usageCount: coupon.redemptions?.length ?? coupon.usedCount,
  totalDiscountAmount: roundMoney((coupon.redemptions || []).reduce((sum, redemption) => sum + redemption.discountAmount, 0))
});

export const getAdminCoupons = async () => {
  const coupons = await prisma.coupon.findMany({
    include: {
      redemptions: {
        select: { discountAmount: true }
      }
    },
    orderBy: [{ createdAt: 'desc' }, { code: 'asc' }]
  });

  return coupons.map(serializeCoupon);
};

export const createAdminCoupon = async (input: {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minAmount?: number | null;
  maxUses?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
}) => {
  const code = normalizeCouponCode(input.code);
  if (!code) throw new HttpError(400, 'Le code coupon est obligatoire.');
  if (input.type === 'PERCENT' && input.value > 95) throw new HttpError(400, 'Un coupon en pourcentage ne peut pas depasser 95%.');

  const validFrom = input.validFrom ? new Date(input.validFrom) : null;
  const validTo = input.validTo ? new Date(input.validTo) : null;
  if (validFrom && validTo && validFrom > validTo) {
    throw new HttpError(400, 'La date de debut doit preceder la date de fin.');
  }

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minAmount: input.minAmount ?? null,
      maxUses: input.maxUses ?? null,
      validFrom,
      validTo,
      active: input.active ?? true
    },
    include: { redemptions: { select: { discountAmount: true } } }
  });

  return serializeCoupon(coupon);
};

export const updateAdminCoupon = async (couponId: string, input: {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minAmount?: number | null;
  maxUses?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
}) => {
  const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!existing) throw new HttpError(404, 'Coupon introuvable.');

  const code = normalizeCouponCode(input.code);
  if (!code) throw new HttpError(400, 'Le code coupon est obligatoire.');
  if (input.type === 'PERCENT' && input.value > 95) throw new HttpError(400, 'Un coupon en pourcentage ne peut pas depasser 95%.');
  if (input.maxUses && input.maxUses < existing.usedCount) {
    throw new HttpError(400, 'Le plafond d utilisations ne peut pas etre inferieur au nombre deja utilise.');
  }

  const validFrom = input.validFrom ? new Date(input.validFrom) : null;
  const validTo = input.validTo ? new Date(input.validTo) : null;
  if (validFrom && validTo && validFrom > validTo) {
    throw new HttpError(400, 'La date de debut doit preceder la date de fin.');
  }

  const coupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      code,
      type: input.type,
      value: input.value,
      minAmount: input.minAmount ?? null,
      maxUses: input.maxUses ?? null,
      validFrom,
      validTo,
      active: input.active ?? true
    },
    include: { redemptions: { select: { discountAmount: true } } }
  });

  return serializeCoupon(coupon);
};

export const deleteAdminCoupon = async (couponId: string) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: { redemptions: { select: { id: true } } }
  });

  if (!coupon) throw new HttpError(404, 'Coupon introuvable.');
  if (coupon.redemptions.length > 0) {
    throw new HttpError(400, 'Ce coupon a deja ete utilise. Desactivez-le au lieu de le supprimer.');
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  return { success: true };
};

export const validateCouponForSubtotal = async (
  couponCode: string | undefined | null,
  subtotal: number,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const normalizedCode = normalizeCouponCode(couponCode);

  if (!normalizedCode) {
    return {
      valid: true,
      code: null,
      couponId: null,
      discountAmount: 0,
      finalSubtotal: roundMoney(subtotal),
      subtotal: roundMoney(subtotal),
      message: ''
    };
  }

  const coupon = await tx.coupon.findUnique({
    where: { code: normalizedCode }
  });

  if (!coupon || !coupon.active) {
    throw new HttpError(400, 'Ce code promo est invalide ou inactif.');
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    throw new HttpError(400, 'Ce code promo n est pas encore actif.');
  }
  if (coupon.validTo && coupon.validTo < now) {
    throw new HttpError(400, 'Ce code promo a expire.');
  }
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    throw new HttpError(400, 'Ce code promo est epuise.');
  }
  if (coupon.minAmount !== null && coupon.minAmount !== undefined && subtotal < coupon.minAmount) {
    throw new HttpError(400, `Le montant minimum pour ce code promo est ${coupon.minAmount.toFixed(2)} TND.`);
  }

  const discountAmount = roundMoney(
    Math.min(
      subtotal,
      coupon.type === 'PERCENT'
        ? (subtotal * coupon.value) / 100
        : coupon.value
    )
  );

  return {
    valid: true,
    code: coupon.code,
    couponId: coupon.id,
    type: coupon.type,
    value: coupon.value,
    discountAmount,
    subtotal: roundMoney(subtotal),
    finalSubtotal: roundMoney(Math.max(0, subtotal - discountAmount)),
    message: discountAmount > 0 ? 'Code promo applique avec succes.' : 'Code promo valide.'
  };
};

export const redeemCouponForOrder = async (
  tx: Prisma.TransactionClient,
  params: {
    couponId: string;
    orderId: string;
    userId?: string | null;
    code: string;
    discountAmount: number;
  }
) => {
  const coupon = await tx.coupon.findUnique({
    where: { id: params.couponId },
    select: { id: true, maxUses: true, usedCount: true }
  });

  if (!coupon) throw new HttpError(404, 'Coupon introuvable.');

  if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
    const result = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        usedCount: { lt: coupon.maxUses }
      },
      data: {
        usedCount: { increment: 1 }
      }
    });

    if (result.count === 0) {
      throw new HttpError(400, 'Ce code promo est epuise.');
    }
  } else {
    await tx.coupon.update({
      where: { id: coupon.id },
      data: {
        usedCount: { increment: 1 }
      }
    });
  }

  await tx.couponRedemption.create({
    data: {
      couponId: params.couponId,
      orderId: params.orderId,
      userId: params.userId || null,
      codeSnapshot: params.code,
      discountAmount: params.discountAmount
    }
  });
};
