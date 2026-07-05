import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL_TEST est requise pour seed les commandes volumineuses.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

const count = Math.max(1, Number(process.argv[2] || 10000));
const batchSize = 500;

const main = async () => {
  const category = await prisma.category.upsert({
    where: { slug: 'perf-orders' },
    update: {},
    create: {
      name: 'Performance Orders',
      slug: 'perf-orders',
      icon: 'Package'
    }
  });

  const listing = await prisma.listing.upsert({
    where: { slug: 'perf-order-product' },
    update: {
      isArchived: false,
      price: 49
    },
    create: {
      title: 'Performance Test Product',
      slug: 'perf-order-product',
      description: 'Produit pour test de pagination commandes',
      price: 49,
      categoryId: category.id,
      imageUrl: 'https://example.com/perf-order-product.png'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'perf-orders-user@test.tn' },
    update: {},
    create: {
      email: 'perf-orders-user@test.tn',
      username: 'perf_orders_user',
      password: 'hashed-placeholder',
      role: 'USER',
      emailVerified: true
    }
  });

  for (let offset = 0; offset < count; offset += batchSize) {
    const size = Math.min(batchSize, count - offset);
    const orders = Array.from({ length: size }, (_, index) => {
      const absoluteIndex = offset + index + 1;
      const orderId = crypto.randomUUID();
      const orderNumber = `PERF-${String(absoluteIndex).padStart(6, '0')}`;
      const status = absoluteIndex % 7 === 0
        ? 'PAYMENT_APPROVED'
        : absoluteIndex % 11 === 0
          ? 'DELIVERED'
          : 'PAYMENT_UNDER_REVIEW';

      return {
        orderId,
        orderNumber,
        invoiceId: crypto.randomUUID(),
        invoiceNumber: `INV-PERF-${String(absoluteIndex).padStart(6, '0')}`,
        paymentId: crypto.randomUUID(),
        itemId: crypto.randomUUID(),
        createdAt: new Date(Date.now() - absoluteIndex * 60_000),
        amount: 49 + (absoluteIndex % 5) * 10,
        status
      };
    });

    await prisma.$transaction([
      prisma.order.createMany({
        data: orders.map((entry) => ({
          id: entry.orderId,
          orderNumber: entry.orderNumber,
          userId: user.id,
          status: entry.status,
          amount: entry.amount,
          subtotal: entry.amount,
          discount: 0,
          total: entry.amount,
          currency: 'TND',
          source: 'AUTHENTICATED',
          customerType: 'USER',
          customerFirstName: 'Perf',
          customerLastName: `Client ${entry.orderNumber}`,
          customerEmail: `perf+${entry.orderNumber.toLowerCase()}@test.tn`,
          customerPhone: '+21699000000',
          paymentMethod: 'whatsapp',
          createdAt: entry.createdAt
        })),
        skipDuplicates: true
      }),
      prisma.orderItem.createMany({
        data: orders.map((entry) => ({
          id: entry.itemId,
          orderId: entry.orderId,
          listingId: listing.id,
          quantity: 1,
          priceSnapshot: entry.amount,
          titleSnapshot: `Commande performance ${entry.orderNumber}`,
          deliveryType: 'MIXED',
          status: 'LOCKED'
        })),
        skipDuplicates: true
      }),
      prisma.payment.createMany({
        data: orders.map((entry) => ({
          id: entry.paymentId,
          orderId: entry.orderId,
          userId: user.id,
          method: 'whatsapp',
          status: entry.status === 'PAYMENT_APPROVED' || entry.status === 'DELIVERED' ? 'APPROVED' : 'SUBMITTED',
          amount: entry.amount,
          currency: 'TND',
          submittedAt: entry.createdAt,
          approvedAt: entry.status === 'PAYMENT_APPROVED' || entry.status === 'DELIVERED' ? entry.createdAt : null,
          paidAt: entry.status === 'PAYMENT_APPROVED' || entry.status === 'DELIVERED' ? entry.createdAt : null
        })),
        skipDuplicates: true
      }),
      prisma.invoice.createMany({
        data: orders.map((entry) => ({
          id: entry.invoiceId,
          invoiceNumber: entry.invoiceNumber,
          orderId: entry.orderId,
          type: 'PROFORMA',
          status: entry.status === 'PAYMENT_APPROVED' || entry.status === 'DELIVERED' ? 'PAID' : 'PENDING_PAYMENT',
          currency: 'TND',
          orderNumber: entry.orderNumber,
          customerFirstName: 'Perf',
          customerLastName: `Client ${entry.orderNumber}`,
          customerEmail: `perf+${entry.orderNumber.toLowerCase()}@test.tn`,
          customerPhone: '+21699000000',
          totalAmount: entry.amount,
          issueDate: entry.createdAt,
          createdAt: entry.createdAt
        })),
        skipDuplicates: true
      })
    ]);

    console.log(`Seed batch ${offset + size}/${count}`);
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log(`Seed termine avec ${count} commandes.`);
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error('Seed volumineux impossible.', error);
    process.exit(1);
  });
