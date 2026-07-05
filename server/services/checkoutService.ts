import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { readSiteConfig, type SiteConfigData, DEFAULT_PAYMENT_METHODS } from './siteConfigService.js';
import { computeLoyaltyRedemption, LOYALTY_REDEEMED_TYPE } from './loyaltyService.js';
import { redeemCouponForOrder, validateCouponForSubtotal } from './couponService.js';

type CheckoutItemInput = {
  listingId: string;
  variantId?: string;
  quantity: number;
};

type PaymentProofInput = {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

type PaymentMethodConfig = NonNullable<SiteConfigData['paymentMethods']>[number];

export type GuestCheckoutInput = {
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  paymentMethod?: string;
  useLoyaltyPoints?: boolean;
  couponCode?: string;
  customerReference?: string;
  paymentProof?: PaymentProofInput | null;
  idempotencyKey?: string;
  items: CheckoutItemInput[];
  userId?: string;
  source?: 'GUEST' | 'AUTHENTICATED';
  ipAddress?: string;
  userAgent?: string;
};

export type SubmitPaymentProofInput = {
  orderNumber: string;
  email?: string | null;
  userId?: string | null;
  reference?: string | null;
  proofUrl?: string | null;
  paymentMethod?: string | null;
  proofMessage?: string | null;
  ipAddress?: string;
  userAgent?: string;
};

type CheckoutLine = {
  listingId: string;
  variantId?: string;
  variantSnapshot?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  titleSnapshot: string;
  productSnapshotImage?: string | null;
  deliveryType: string;
};

const activeCheckoutLocks = new Set<string>();
const rateBuckets = new Map<string, number[]>();

const ACTIVE_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_UNDER_REVIEW',
  'PAYMENT_APPROVED',
  'PAID',
  'IN_DELIVERY'
];

const ALLOWED_PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const ALLOWED_PROOF_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

const normalizeText = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');
const normalizeEmail = (value?: string) => (value || '').trim().toLowerCase();
const normalizePhone = (value?: string) => (value || '').trim().replace(/\s+/g, '');
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getListingFinalPrice = (listing: { price: number; discountType?: string | null; discountValue?: number | null; discountPercent?: number | null }) => {
  if (listing.discountType === 'PERCENT') {
    return Math.max(0, listing.price * (1 - (Number(listing.discountValue ?? listing.discountPercent ?? 0) / 100)));
  }
  if (listing.discountType === 'AMOUNT') {
    return Math.max(0, listing.price - Number(listing.discountValue ?? 0));
  }
  if ((listing.discountPercent ?? 0) > 0) {
    return Math.max(0, listing.price * (1 - (Number(listing.discountPercent) / 100)));
  }
  return listing.price;
};

const consumeRateLimit = (key: string, maxAttempts: number, windowMs: number) => {
  const now = Date.now();
  const attempts = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (attempts.length >= maxAttempts) return false;
  attempts.push(now);
  rateBuckets.set(key, attempts);
  return true;
};

const nextSequenceValue = async (tx: Prisma.TransactionClient, key: string) => {
  await tx.sequence.upsert({
    where: { key },
    create: { key, value: 0 },
    update: {}
  });

  const updated = await tx.sequence.update({
    where: { key },
    data: { value: { increment: 1 } }
  });

  return updated.value;
};

const formatDocumentNumber = (prefix: string, year: number, value: number) => `${prefix}-${year}-${String(value).padStart(6, '0')}`;

const buildCartFingerprint = (items: CheckoutItemInput[]) =>
  sha256(
    items
      .map((item) => `${item.listingId}:${item.variantId || ''}:${item.quantity}`)
      .sort()
      .join('|')
  );

const inferDeliveryType = (listing: { productType?: string | null; source?: string | null }) => {
  if (listing.productType === 'KEY') return 'KEY';
  if (listing.productType === 'LOGIN_CREDENTIALS') return 'ACCOUNT';
  if (listing.source) return 'LINK';
  return 'MIXED';
};

const normalizePaymentMethods = (methods?: SiteConfigData['paymentMethods']) => {
  const source = Array.isArray(methods) && methods.length > 0 ? methods : DEFAULT_PAYMENT_METHODS;
  return source
    .map((method, index) => ({
      ...method,
      id: normalizeText(method.id).toLowerCase(),
      label: normalizeText(method.label),
      instructions: normalizeText(method.instructions),
      accountDetails: (method.accountDetails || '').trim(),
      isActive: Boolean(method.isActive),
      sortOrder: Number.isFinite(Number(method.sortOrder)) ? Number(method.sortOrder) : (index + 1) * 10
    }))
    .filter((method) => method.id && method.label)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};

export const getConfiguredPaymentMethods = async () => {
  const config = await readSiteConfig();
  return normalizePaymentMethods(config.paymentMethods);
};

export const getActivePaymentMethods = async () => (await getConfiguredPaymentMethods()).filter((method) => method.isActive);

export const getPaymentMethodById = async (methodId?: string | null) => {
  const normalized = normalizeText(methodId).toLowerCase();
  const methods = await getConfiguredPaymentMethods();
  return methods.find((method) => method.id === normalized) || null;
};

const buildCheckoutLines = async (items: CheckoutItemInput[]): Promise<CheckoutLine[]> => {
  const listingIds = [...new Set(items.map((item) => item.listingId))];
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, isArchived: false },
    include: { variants: true }
  });
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));

  return items.map((item) => {
    const listing = listingMap.get(item.listingId);
    if (!listing) throw new Error('Un ou plusieurs produits du panier sont introuvables.');

    const variant = item.variantId ? listing.variants.find((entry) => entry.id === item.variantId) : null;
    if (listing.variants.length > 0 && !variant) throw new Error('Une variante doit etre selectionnee pour un ou plusieurs produits.');

    const unitPrice = variant ? variant.price : getListingFinalPrice(listing);
    const variantSnapshot = variant?.name;

    return {
      listingId: listing.id,
      variantId: variant?.id,
      variantSnapshot,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      titleSnapshot: variantSnapshot ? `${listing.title} - ${variantSnapshot}` : listing.title,
      productSnapshotImage: listing.imageUrl,
      deliveryType: inferDeliveryType(listing)
    };
  });
};

const validateProofUpload = async (proof?: PaymentProofInput | null) => {
  if (!proof) return null;
  const extension = path.extname(proof.fileName || '').toLowerCase();
  if (!ALLOWED_PROOF_MIME_TYPES.has(proof.mimeType) || !ALLOWED_PROOF_EXTENSIONS.has(extension)) {
    throw new Error('Preuve de paiement invalide. Formats acceptes: JPG, PNG, WEBP ou PDF.');
  }
  if (!Number.isFinite(proof.size) || proof.size <= 0 || proof.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error('La preuve de paiement ne doit pas depasser 5 Mo.');
  }

  const match = proof.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || match[1] !== proof.mimeType) {
    throw new Error('Fichier de preuve invalide.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_PROOF_SIZE_BYTES) throw new Error('La preuve de paiement ne doit pas depasser 5 Mo.');

  const safeName = `${crypto.randomUUID()}${extension}`;
  const uploadDir = path.resolve(process.cwd(), 'server', 'uploads', 'payment-proofs');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer, { flag: 'wx' });
  return `/secure-uploads/payment-proofs/${safeName}`;
};

export const validateGuestCheckoutInput = async (input: GuestCheckoutInput) => {
  const firstName = normalizeText(input.firstName) || 'Client';
  const lastName = normalizeText(input.lastName) || 'Tunibots';
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const paymentMethods = await getActivePaymentMethods();
  const fallbackMethod = paymentMethods[0]?.id || DEFAULT_PAYMENT_METHODS[0].id;
  const paymentMethod = normalizeText(input.paymentMethod).toLowerCase() || fallbackMethod;
  const customerReference = normalizeText(input.customerReference);
  const useLoyaltyPoints = Boolean(input.useLoyaltyPoints);
  const couponCode = normalizeText(input.couponCode).toUpperCase();
  const idempotencyKey = normalizeText(input.idempotencyKey);
  const items = (input.items || [])
    .filter((item) => item && typeof item.listingId === 'string')
    .map((item) => ({
      listingId: item.listingId.trim(),
      variantId: typeof item.variantId === 'string' ? item.variantId.trim() : undefined,
      quantity: Number(item.quantity || 0)
    }))
    .filter((item) => item.listingId && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse email invalide.');
  if (!/^[+\d][\d\s()-]{7,}$/.test(input.phone || '')) throw new Error('Numero de telephone invalide.');
  if (!paymentMethods.some((method) => method.id === paymentMethod)) throw new Error('Methode de paiement invalide ou inactive.');
  if (items.length === 0) throw new Error('Votre panier est vide.');

  return {
    firstName,
    lastName,
    email,
    phone,
    paymentMethod,
    useLoyaltyPoints,
    couponCode,
    customerReference,
    idempotencyKey,
    items,
    userId: input.userId,
    source: input.source || 'GUEST',
    customerType: input.userId ? 'USER' : 'GUEST'
  };
};

export const createCheckoutOrder = async (rawInput: GuestCheckoutInput) => {
  const input = await validateGuestCheckoutInput(rawInput);
  const cartFingerprint = buildCartFingerprint(input.items);
  const lockKey = `${input.userId || `${input.email}:${input.phone}`}:${cartFingerprint}`;

  if (input.idempotencyKey) {
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { items: true, invoice: { include: { items: true } }, payments: true, deliveries: true, actionLogs: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    if (existingOrder) return { ...existingOrder, buyerId: existingOrder.userId || existingOrder.id, buyer: existingOrder.user, trackingToken: null };
  }

  if (activeCheckoutLocks.has(lockKey)) throw new Error('Une validation de ce panier est deja en cours.');
  if (!consumeRateLimit(`checkout:ip:${rawInput.ipAddress || 'unknown'}`, 10, 60 * 60 * 1000)) {
    throw new Error('Trop de tentatives de checkout. Veuillez reessayer plus tard.');
  }
  if (!input.userId && !consumeRateLimit(`checkout:guest:${input.email}:${input.phone}`, 4, 60 * 60 * 1000)) {
    throw new Error('Trop de commandes invite avec cet email ou telephone. Veuillez reessayer plus tard.');
  }

  activeCheckoutLocks.add(lockKey);

  try {
    const duplicateSince = new Date(Date.now() - 15 * 60 * 1000);
    const duplicateOrder = await prisma.order.findFirst({
      where: {
        cartFingerprint,
        guestEmail: input.userId ? undefined : input.email,
        guestPhone: input.userId ? undefined : input.phone,
        userId: input.userId || undefined,
        status: { in: ACTIVE_ORDER_STATUSES },
        createdAt: { gte: duplicateSince }
      }
    });
    if (duplicateOrder) throw new Error(`Une commande active existe deja pour ce panier: ${duplicateOrder.orderNumber}.`);

    const proofFileUrl = await validateProofUpload(rawInput.paymentProof);
    const lines = await buildCheckoutLines(input.items);
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const now = new Date();
    const year = now.getUTCFullYear();
    const trackingToken = input.userId ? null : crypto.randomBytes(32).toString('hex');
    const trackingTokenHash = trackingToken ? sha256(trackingToken) : null;

    const order = await prisma.$transaction(async (tx) => {
      const couponRedemption = await validateCouponForSubtotal(input.couponCode, subtotal, tx);
      const loyaltyRedemption = await computeLoyaltyRedemption({
        userId: input.userId,
        subtotal: couponRedemption.finalSubtotal,
        useLoyaltyPoints: input.useLoyaltyPoints,
        tx
      });
      const discount = roundMoney(couponRedemption.discountAmount + loyaltyRedemption.discountAmount);
      const totalAmount = Math.max(0, subtotal - discount);
      const proofDeclaredAt = proofFileUrl || input.customerReference ? now : null;
      const orderStatus = proofDeclaredAt ? 'PAYMENT_RECEIVED' : 'PAYMENT_UNDER_REVIEW';
      const orderSequence = await nextSequenceValue(tx, `ORDER-${year}`);
      const invoiceSequence = await nextSequenceValue(tx, `INVOICE-${year}`);
      const orderNumber = formatDocumentNumber('CMD', year, orderSequence);
      const invoiceNumber = formatDocumentNumber('FAC', year, invoiceSequence);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: input.idempotencyKey || undefined,
          userId: input.userId,
          status: orderStatus,
          amount: totalAmount,
          subtotal,
          discount,
          total: totalAmount,
          currency: 'TND',
          source: input.source,
          customerType: input.customerType,
          guestEmail: input.userId ? null : input.email,
          guestPhone: input.userId ? null : input.phone,
          cartFingerprint,
          trackingTokenHash,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          customerFirstName: input.firstName,
          customerLastName: input.lastName,
          customerEmail: input.email,
          customerPhone: input.phone,
          paymentMethod: input.paymentMethod,
          couponCode: couponRedemption.code,
          items: {
            create: lines.map((line) => ({
              listingId: line.listingId,
              variantId: line.variantId,
              quantity: line.quantity,
              priceSnapshot: line.unitPrice,
              titleSnapshot: line.titleSnapshot,
              productSnapshotImage: line.productSnapshotImage,
              variantSnapshot: line.variantSnapshot,
              deliveryType: line.deliveryType,
              status: 'LOCKED'
            }))
          },
          payments: {
            create: {
              userId: input.userId,
              method: input.paymentMethod,
              status: proofDeclaredAt ? 'SUBMITTED' : 'PENDING',
              amount: totalAmount,
              currency: 'TND',
              customerReference: input.customerReference || null,
              reference: input.customerReference || null,
              transactionRef: null,
              proofFileUrl,
              proofUrl: proofFileUrl,
              declaredAt: proofDeclaredAt,
              submittedAt: now
            }
          }
        },
        include: { items: true, payments: true }
      });

      const orderItemsByLineKey = new Map(createdOrder.items.map((item) => [`${item.listingId}:${item.variantId || ''}`, item]));

      await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: createdOrder.id,
          type: 'PROFORMA',
          status: 'PENDING_PAYMENT',
          currency: 'TND',
          orderNumber,
          customerFirstName: input.firstName,
          customerLastName: input.lastName,
          customerEmail: input.email,
          customerPhone: input.phone,
          totalAmount,
          items: {
            create: lines.map((line) => ({
              orderItemId: orderItemsByLineKey.get(`${line.listingId}:${line.variantId || ''}`)?.id,
              listingId: line.listingId,
              variantSnapshot: line.variantSnapshot,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
              titleSnapshot: line.titleSnapshot
            }))
          }
        }
      });

      if (input.userId && loyaltyRedemption.pointsUsed > 0) {
        await tx.loyaltyPoint.create({
          data: {
            userId: input.userId,
            orderId: createdOrder.id,
            points: -loyaltyRedemption.pointsUsed,
            type: LOYALTY_REDEEMED_TYPE,
            description: `Points utilises sur la commande ${orderNumber}.`
          }
        });
      }

      if (couponRedemption.couponId && couponRedemption.discountAmount > 0) {
        await redeemCouponForOrder(tx, {
          couponId: couponRedemption.couponId,
          orderId: createdOrder.id,
          userId: input.userId,
          code: couponRedemption.code || input.couponCode || '',
          discountAmount: couponRedemption.discountAmount
        });
      }

      await tx.orderActionLog.createMany({
        data: [
          {
            orderId: createdOrder.id,
            actorType: input.userId ? 'USER' : 'GUEST',
            actorId: input.userId || null,
            action: 'ORDER_CREATED',
            ipAddress: rawInput.ipAddress,
            userAgent: rawInput.userAgent,
            metadata: {
              cartFingerprint,
              itemCount: lines.length,
              couponCode: couponRedemption.code,
              couponDiscountAmount: couponRedemption.discountAmount,
              loyaltyPointsUsed: loyaltyRedemption.pointsUsed,
              loyaltyDiscountAmount: loyaltyRedemption.discountAmount
            }
          },
          {
            orderId: createdOrder.id,
            actorType: input.userId ? 'USER' : 'GUEST',
            actorId: input.userId || null,
            action: proofDeclaredAt ? 'PAYMENT_PROOF_SUBMITTED' : 'PAYMENT_PENDING',
            ipAddress: rawInput.ipAddress,
            userAgent: rawInput.userAgent,
            metadata: { method: input.paymentMethod, hasProof: Boolean(proofFileUrl), customerReference: input.customerReference || null }
          }
        ]
      });

      return tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: {
          items: true,
          invoice: { include: { items: true } },
          payments: true,
          deliveries: true,
          actionLogs: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, username: true, email: true, avatarUrl: true } }
        }
      });
    });

    return { ...order, buyerId: order.userId || order.id, buyer: order.user, trackingToken };
  } finally {
    activeCheckoutLocks.delete(lockKey);
  }
};

export const clearUserCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};

export const submitPaymentProofForOrder = async (input: SubmitPaymentProofInput) => {
  const orderNumber = normalizeText(input.orderNumber);
  const email = normalizeEmail(input.email || '');
  const reference = normalizeText(input.reference);
  const proofUrl = normalizeText(input.proofUrl);
  const paymentMethod = normalizeText(input.paymentMethod).toLowerCase();
  const proofMessage = normalizeText(input.proofMessage);

  if (!reference && !proofUrl) {
    throw new Error('Une preuve de paiement ou une reference de transaction est obligatoire.');
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      invoice: { include: { items: true } },
      payments: true,
      deliveries: true,
      actionLogs: { orderBy: { createdAt: 'asc' } },
      user: { select: { id: true, username: true, email: true, avatarUrl: true } }
    }
  });

  if (!order) throw new Error('Commande introuvable.');

  const ownerAllowed = input.userId && order.userId === input.userId;
  const guestAllowed = !input.userId && email && email === order.customerEmail.toLowerCase();
  if (!ownerAllowed && !guestAllowed) {
    throw new Error('Verification requise pour soumettre la preuve de paiement.');
  }

  if (['PAYMENT_APPROVED', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
    throw new Error('Cette commande ne peut plus recevoir de nouvelle preuve de paiement.');
  }

  const configuredMethod = paymentMethod ? await getPaymentMethodById(paymentMethod) : null;
  if (paymentMethod && !configuredMethod) {
    throw new Error('Methode de paiement invalide.');
  }

  const targetPayment = [...order.payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .find((payment) => !['APPROVED', 'PAID'].includes(payment.status)) || order.payments[0];

  if (!targetPayment) throw new Error('Paiement introuvable pour cette commande.');

  const declaredAt = new Date();
  const nextMethod = configuredMethod?.id || order.paymentMethod || targetPayment.method;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: targetPayment.id },
      data: {
        method: nextMethod,
        status: 'SUBMITTED',
        reference: reference || targetPayment.reference || targetPayment.customerReference || null,
        customerReference: reference || targetPayment.customerReference || null,
        proofUrl: proofUrl || targetPayment.proofUrl || targetPayment.proofFileUrl || null,
        proofFileUrl: proofUrl || targetPayment.proofFileUrl || null,
        declaredAt,
        submittedAt: declaredAt,
        notes: proofMessage || targetPayment.notes || null
      }
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAYMENT_RECEIVED',
        paymentMethod: nextMethod
      }
    });

    await tx.orderActionLog.create({
      data: {
        orderId: order.id,
        actorType: input.userId ? 'USER' : 'GUEST',
        actorId: input.userId || null,
        action: 'PAYMENT_PROOF_SUBMITTED',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          orderNumber: order.orderNumber,
          paymentId: targetPayment.id,
          method: nextMethod,
          reference: reference || null,
          proofUrl: proofUrl || null,
          proofMessage: proofMessage || null
        }
      }
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        items: true,
        invoice: { include: { items: true } },
        payments: true,
        deliveries: true,
        actionLogs: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, username: true, email: true, avatarUrl: true } }
      }
    });
  });

  return { ...updatedOrder, buyerId: updatedOrder.userId || updatedOrder.id, buyer: updatedOrder.user, trackingToken: null };
};

export const getPaymentInstructions = (method?: string | null) => {
  const selected = normalizeText(method).toLowerCase();
  const fallback = DEFAULT_PAYMENT_METHODS[0];
  const matched = DEFAULT_PAYMENT_METHODS.find((entry) => entry.id === selected) || fallback;
  return matched.instructions;
};
