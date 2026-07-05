import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Coupons integration', () => {
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

  it('validates a coupon and applies it during guest checkout with redemption tracking', async () => {
    const category = await createCategory(prisma, 'Coupons');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit coupon',
      slug: `produit-coupon-${crypto.randomUUID().slice(0, 8)}`,
      price: 100
    });

    await prisma.coupon.create({
      data: {
        code: 'WELCOME10',
        type: 'PERCENT',
        value: 10,
        active: true
      }
    });

    const validationResponse = await request(app)
      .post('/api/checkout/coupon/validate')
      .send({
        couponCode: 'welcome10',
        subtotal: 200
      });

    expect(validationResponse.status).toBe(200);
    expect(validationResponse.body.valid).toBe(true);
    expect(validationResponse.body.code).toBe('WELCOME10');
    expect(validationResponse.body.discountAmount).toBe(20);
    expect(validationResponse.body.finalSubtotal).toBe(180);

    const checkoutResponse = await request(app)
      .post('/api/checkout/guest')
      .send({
        firstName: 'Coupon',
        lastName: 'Guest',
        email: `coupon-${crypto.randomUUID()}@test.tn`,
        phone: '+21655112233',
        paymentMethod: 'bank_transfer',
        couponCode: 'welcome10',
        idempotencyKey: `guest-coupon-${crypto.randomUUID()}`,
        items: [
          {
            listingId: listing.id,
            quantity: 2
          }
        ]
      });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.subtotal).toBe(200);
    expect(checkoutResponse.body.discount).toBe(20);
    expect(checkoutResponse.body.total).toBe(180);
    expect(checkoutResponse.body.amount).toBe(180);
    expect(checkoutResponse.body.couponCode).toBe('WELCOME10');

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: checkoutResponse.body.id },
      include: {
        couponRedemption: true,
        invoice: true
      }
    });

    expect(persistedOrder.discount).toBe(20);
    expect(persistedOrder.total).toBe(180);
    expect(persistedOrder.couponCode).toBe('WELCOME10');
    expect(persistedOrder.couponRedemption?.codeSnapshot).toBe('WELCOME10');
    expect(persistedOrder.couponRedemption?.discountAmount).toBe(20);
    expect(persistedOrder.invoice?.totalAmount).toBe(180);

    const persistedCoupon = await prisma.coupon.findUniqueOrThrow({
      where: { code: 'WELCOME10' },
      include: { redemptions: true }
    });

    expect(persistedCoupon.usedCount).toBe(1);
    expect(persistedCoupon.redemptions).toHaveLength(1);
  });

  it('refuses expired, exhausted and minimum-threshold coupons on the server', async () => {
    const now = new Date();

    await prisma.coupon.create({
      data: {
        code: 'EXPIRED5',
        type: 'FIXED',
        value: 5,
        active: true,
        validTo: new Date(now.getTime() - 60_000)
      }
    });

    await prisma.coupon.create({
      data: {
        code: 'LIMIT1',
        type: 'FIXED',
        value: 5,
        active: true,
        maxUses: 1,
        usedCount: 1
      }
    });

    await prisma.coupon.create({
      data: {
        code: 'MIN150',
        type: 'PERCENT',
        value: 15,
        active: true,
        minAmount: 150
      }
    });

    const expiredResponse = await request(app)
      .post('/api/checkout/coupon/validate')
      .send({
        couponCode: 'EXPIRED5',
        subtotal: 50
      });

    expect(expiredResponse.status).toBe(400);
    expect(expiredResponse.body.error).toContain('expire');

    const exhaustedResponse = await request(app)
      .post('/api/checkout/coupon/validate')
      .send({
        couponCode: 'LIMIT1',
        subtotal: 50
      });

    expect(exhaustedResponse.status).toBe(400);
    expect(exhaustedResponse.body.error).toContain('epuise');

    const minAmountResponse = await request(app)
      .post('/api/checkout/coupon/validate')
      .send({
        couponCode: 'MIN150',
        subtotal: 100
      });

    expect(minAmountResponse.status).toBe(400);
    expect(minAmountResponse.body.error).toContain('montant minimum');
  });

  it('lets staff manage coupons and exposes usage stats in the admin list', async () => {
    const admin = await createUser(prisma, {
      email: 'coupon-admin@test.tn',
      username: 'coupon-admin',
      role: 'ADMIN'
    });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const createResponse = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SUMMER25',
        type: 'PERCENT',
        value: 25,
        minAmount: 80,
        maxUses: 20,
        active: true
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.code).toBe('SUMMER25');
    expect(createResponse.body.usageCount).toBe(0);

    const updateResponse = await request(app)
      .patch(`/api/admin/coupons/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SUMMER30',
        type: 'PERCENT',
        value: 30,
        minAmount: 90,
        maxUses: 25,
        active: false
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.code).toBe('SUMMER30');
    expect(updateResponse.body.active).toBe(false);

    const listResponse = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);

    const usedCoupon = listResponse.body.find((coupon: { code: string }) => coupon.code === 'WELCOME10');
    expect(usedCoupon).toBeTruthy();
    expect(usedCoupon.usageCount).toBe(1);
    expect(usedCoupon.totalDiscountAmount).toBe(20);

    const deleteResponse = await request(app)
      .delete(`/api/admin/coupons/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const deletedCoupon = await prisma.coupon.findUnique({
      where: { id: createResponse.body.id }
    });

    expect(deletedCoupon).toBeNull();
  });
});
