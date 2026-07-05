import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';
import { encryptDeliveryContent } from '../../server/services/deliverySecurityService.js';

describe('Loyalty integration', () => {
  let prisma: Awaited<ReturnType<typeof loadPrisma>>;
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let signAccessToken: Awaited<ReturnType<typeof loadAuthTools>>['signAccessToken'];

  beforeAll(async () => {
    resetTestDatabase();
    prisma = await loadPrisma();
    app = await createTestApp();
    ({ signAccessToken } = await loadAuthTools());
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('redeems loyalty points at checkout and credits new points on delivery', async () => {
    const admin = await createUser(prisma, {
      email: 'loyalty-admin@test.tn',
      username: 'loyalty-admin',
      role: 'ADMIN'
    });
    const user = await createUser(prisma, {
      email: 'loyalty-user@test.tn',
      username: 'loyalty-user',
      role: 'USER'
    });
    const category = await createCategory(prisma, 'Loyalty');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit fidelite',
      slug: 'produit-fidelite',
      price: 20,
      isInstant: true
    });

    const siteConfig = await prisma.siteConfig.findUnique({ where: { key: 'site' } });
    await prisma.siteConfig.upsert({
      where: { key: 'site' },
      update: {
        data: {
          ...((siteConfig?.data as Record<string, unknown> | undefined) || {}),
          loyaltyPointsPerDinar: 10,
          loyaltyMaxDiscountPercent: 25
        }
      },
      create: {
        key: 'site',
        data: {
          loyaltyPointsPerDinar: 10,
          loyaltyMaxDiscountPercent: 25
        }
      }
    });

    await prisma.loyaltyPoint.create({
      data: {
        userId: user.id,
        points: 500,
        type: 'MANUAL_SEED',
        description: 'Credit initial de test.'
      }
    });

    const userToken = signAccessToken({ id: user.id, role: user.role });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    await prisma.cart.create({
      data: {
        userId: user.id,
        items: {
          create: {
            listingId: listing.id,
            quantity: 1
          }
        }
      }
    });

    const checkoutResponse = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'bank_transfer',
        useLoyaltyPoints: true,
        phone: '+21655667788',
        idempotencyKey: 'loyalty-test-order'
      });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.subtotal).toBe(20);
    expect(checkoutResponse.body.discount).toBe(5);
    expect(checkoutResponse.body.total).toBe(15);
    expect(checkoutResponse.body.amount).toBe(15);

    const orderId = checkoutResponse.body.id as string;
    const orderItemId = checkoutResponse.body.items[0].id as string;

    const loyaltyAfterCheckout = await request(app)
      .get('/api/users/me/loyalty')
      .set('Authorization', `Bearer ${userToken}`);

    expect(loyaltyAfterCheckout.status).toBe(200);
    expect(loyaltyAfterCheckout.body.balance).toBe(0);
    expect(loyaltyAfterCheckout.body.history.some((entry: any) => entry.type === 'REDEEMED_CHECKOUT' && entry.points === -500)).toBe(true);

    await prisma.delivery.create({
      data: {
        orderId,
        orderItemId,
        status: 'READY',
        deliveryType: 'KEY',
        deliveryContentEncrypted: encryptDeliveryContent('LOYALTY-KEY-001')
      }
    });

    const approveResponse = await request(app)
      .post(`/api/admin/orders/${orderId}/payment/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe('DELIVERED');

    const loyaltyAfterDelivery = await request(app)
      .get('/api/users/me/loyalty')
      .set('Authorization', `Bearer ${userToken}`);

    expect(loyaltyAfterDelivery.status).toBe(200);
    expect(loyaltyAfterDelivery.body.balance).toBe(150);
    expect(loyaltyAfterDelivery.body.history.some((entry: any) => entry.type === 'EARNED_DELIVERY' && entry.points === 150)).toBe(true);
  });
});
