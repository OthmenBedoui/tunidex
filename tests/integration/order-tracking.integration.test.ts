import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createPendingOrder, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';
import { encryptDeliveryContent } from '../../server/services/deliverySecurityService.js';

describe('Order tracking integration', () => {
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

  it('exposes a full status timeline to a guest using order number + email', async () => {
    const user = await createUser(prisma, {
      email: 'track-client@test.tn',
      username: 'track-client',
      role: 'USER'
    });
    const category = await createCategory(prisma, 'Tracking');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit suivi',
      slug: 'produit-suivi',
      price: 75,
      isInstant: true
    });

    const order = await createPendingOrder(prisma, {
      userId: user.id,
      userEmail: user.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 75
    });

    const paymentEventAt = new Date('2026-07-05T09:00:00.000Z');
    const deliveredAt = new Date('2026-07-05T10:30:00.000Z');

    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: 'PAID',
        declaredAt: paymentEventAt,
        paidAt: paymentEventAt
      }
    });

    await prisma.delivery.create({
      data: {
        orderId: order.id,
        orderItemId: order.items[0].id,
        status: 'SENT',
        sentAt: deliveredAt,
        deliveryType: 'KEY',
        deliveryContentEncrypted: encryptDeliveryContent('TRACK-KEY-123')
      }
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'DELIVERED',
        paymentConfirmedAt: paymentEventAt
      }
    });

    await prisma.orderActionLog.createMany({
      data: [
        {
          orderId: order.id,
          actorType: 'SYSTEM',
          action: 'PAYMENT_PROOF_SUBMITTED',
          metadata: { status: 'PAYMENT_RECEIVED' },
          createdAt: paymentEventAt
        },
        {
          orderId: order.id,
          actorType: 'ADMIN',
          actorId: user.id,
          action: 'DELIVERY_SENT',
          metadata: { deliveryCount: 1 },
          createdAt: deliveredAt
        }
      ]
    });

    const response = await request(app)
      .get(`/api/orders/${order.orderNumber}/track`)
      .query({ email: user.email });

    expect(response.status).toBe(200);
    expect(response.body.orderNumber).toBe(order.orderNumber);
    expect(response.body.statusHistory).toHaveLength(3);
    expect(response.body.statusHistory.map((entry: any) => entry.key)).toEqual([
      'received',
      'payment_verified',
      'delivered'
    ]);
    expect(response.body.statusHistory.every((entry: any) => entry.state === 'done')).toBe(true);
    expect(response.body.statusHistory[0].happenedAt).toEqual(expect.any(String));
    expect(response.body.statusHistory[1].happenedAt).toBe(paymentEventAt.toISOString());
    expect(response.body.statusHistory[2].happenedAt).toBe(deliveredAt.toISOString());
  });

  it('sends a client notification and an outbox email when an admin changes status manually', async () => {
    const admin = await createUser(prisma, {
      email: 'track-admin@test.tn',
      username: 'track-admin',
      role: 'ADMIN'
    });
    const client = await createUser(prisma, {
      email: 'track-manual-client@test.tn',
      username: 'track-manual-client',
      role: 'USER'
    });
    const category = await createCategory(prisma, 'Tracking status');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit statut',
      slug: 'produit-statut',
      price: 35
    });
    const order = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 35
    });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PAID');

    const notification = await prisma.notification.findFirst({
      where: {
        orderId: order.id,
        recipientId: client.id,
        type: 'PAYMENT_APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    expect(notification).not.toBeNull();
    expect(notification?.message).toContain(order.orderNumber);

    const email = await prisma.emailOutbox.findFirst({
      where: {
        to: client.email,
        template: 'orderStatusUpdate'
      },
      orderBy: { createdAt: 'desc' }
    });

    expect(email).not.toBeNull();
    expect(email?.status).toBe('PENDING');
  });
});
