import type { PrismaClient } from '@prisma/client';
import { hashPassword } from './testRuntime.js';

export const createUser = async (
  prisma: PrismaClient,
  overrides: Partial<{
    email: string;
    username: string;
    role: string;
    password: string;
    emailVerified: boolean;
    fullName: string;
    address: string;
    phone: string;
  }> = {}
) => {
  const password = await hashPassword(overrides.password || 'ChangeMe123!');

  return prisma.user.create({
    data: {
      email: overrides.email || `user-${crypto.randomUUID()}@test.tn`,
      username: overrides.username || `user_${crypto.randomUUID().slice(0, 8)}`,
      password,
      role: overrides.role || 'USER',
      emailVerified: overrides.emailVerified ?? true,
      fullName: overrides.fullName || 'Test User',
      address: overrides.address || 'Rue de test',
      phone: overrides.phone || '+21612345678',
    },
  });
};

export const createCategory = async (prisma: PrismaClient, name = 'Tests') => {
  return prisma.category.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`,
      icon: 'Box',
    },
  });
};

export const createListing = async (
  prisma: PrismaClient,
  categoryId: string,
  overrides: Partial<{
    title: string;
    slug: string;
    description: string;
    price: number;
    imageUrl: string;
    discountType: string;
    discountValue: number;
    discountPercent: number;
    isInstant: boolean;
  }> = {}
) => {
  return prisma.listing.create({
    data: {
      title: overrides.title || `Produit ${crypto.randomUUID().slice(0, 8)}`,
      slug: overrides.slug || `produit-${crypto.randomUUID().slice(0, 8)}`,
      description: overrides.description || 'Produit de test',
      price: overrides.price ?? 100,
      categoryId,
      imageUrl: overrides.imageUrl || 'https://example.com/product.png',
      isInstant: overrides.isInstant ?? true,
      discountType: overrides.discountType || 'NONE',
      discountValue: overrides.discountValue ?? 0,
      discountPercent: overrides.discountPercent ?? 0,
    },
  });
};

export const createPendingOrder = async (
  prisma: PrismaClient,
  options: {
    userId: string;
    userEmail: string;
    listingId: string;
    titleSnapshot?: string;
    amount?: number;
    paymentMethod?: string;
    orderNumber?: string;
  }
) => {
  const amount = options.amount ?? 30;
  const orderNumber = options.orderNumber || `CMD-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const invoiceNumber = `FAC-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return prisma.order.create({
    data: {
      orderNumber,
      userId: options.userId,
      status: 'PAYMENT_UNDER_REVIEW',
      amount,
      subtotal: amount,
      discount: 0,
      total: amount,
      currency: 'TND',
      source: 'AUTHENTICATED',
      customerType: 'USER',
      customerFirstName: 'Client',
      customerLastName: 'Test',
      customerEmail: options.userEmail,
      customerPhone: '+21699887766',
      paymentMethod: options.paymentMethod || 'whatsapp',
      items: {
        create: {
          listingId: options.listingId,
          quantity: 1,
          priceSnapshot: amount,
          titleSnapshot: options.titleSnapshot || 'Produit de test',
          deliveryType: 'MIXED',
          status: 'LOCKED',
        },
      },
      payments: {
        create: {
          userId: options.userId,
          method: options.paymentMethod || 'whatsapp',
          status: 'SUBMITTED',
          amount,
          currency: 'TND',
          submittedAt: new Date(),
        },
      },
      invoice: {
        create: {
          invoiceNumber,
          type: 'PROFORMA',
          status: 'PENDING_PAYMENT',
          currency: 'TND',
          orderNumber,
          customerFirstName: 'Client',
          customerLastName: 'Test',
          customerEmail: options.userEmail,
          customerPhone: '+21699887766',
          totalAmount: amount,
        },
      },
    },
    include: {
      items: true,
      payments: true,
      invoice: true,
    },
  });
};
