import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createPendingOrder, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';
import { encryptDeliveryContent } from '../../server/services/deliverySecurityService.js';

describe('Admin orders and security integration', () => {
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
    await prisma.$disconnect();
  });

  it('bloque une route admin sans token puis avec un token USER', async () => {
    const user = await createUser(prisma, {
      email: 'security-user@test.tn',
      username: 'security-user',
      role: 'USER',
    });
    const userToken = signAccessToken({ id: user.id, role: user.role });

    const noTokenResponse = await request(app).get('/api/users');
    expect(noTokenResponse.status).toBe(401);

    const userTokenResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(userTokenResponse.status).toBe(403);
  });

  it('approuve puis rejette des paiements avec traces dans OrderActionLog', async () => {
    const admin = await createUser(prisma, {
      email: 'admin-orders@test.tn',
      username: 'admin-orders',
      role: 'ADMIN',
    });
    const client = await createUser(prisma, {
      email: 'client-orders@test.tn',
      username: 'client-orders',
      role: 'USER',
    });
    const category = await createCategory(prisma, 'Orders');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit commandes',
      slug: 'produit-commandes',
      price: 30,
    });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const orderToApprove = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 30,
    });
    const orderToReject = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 45,
    });

    const approveResponse = await request(app)
      .post(`/api/admin/orders/${orderToApprove.id}/payment/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe('PAID');
    expect(approveResponse.body.invoice.status).toBe('PAID');
    expect(approveResponse.body.payments[0].status).toBe('PAID');

    const approvedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderToApprove.id },
      include: {
        invoice: true,
        payments: true,
        actionLogs: true,
      },
    });
    expect(approvedOrder.status).toBe('PAID');
    expect(approvedOrder.invoice?.status).toBe('PAID');
    expect(approvedOrder.payments[0].status).toBe('PAID');
    expect(approvedOrder.actionLogs.some((log) => log.action === 'PAYMENT_APPROVED')).toBe(true);

    const rejectResponse = await request(app)
      .post(`/api/admin/orders/${orderToReject.id}/payment/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Paiement illisible' });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.status).toBe('PAYMENT_REJECTED');
    expect(rejectResponse.body.invoice.status).toBe('PAYMENT_REJECTED');
    expect(rejectResponse.body.payments[0].status).toBe('REJECTED');

    const rejectedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderToReject.id },
      include: {
        invoice: true,
        payments: true,
        actionLogs: true,
      },
    });
    expect(rejectedOrder.status).toBe('PAYMENT_REJECTED');
    expect(rejectedOrder.invoice?.status).toBe('PAYMENT_REJECTED');
    expect(rejectedOrder.payments[0].status).toBe('REJECTED');

    const rejectionLog = rejectedOrder.actionLogs.find((log) => log.action === 'PAYMENT_REJECTED');
    expect(rejectionLog).toBeDefined();
    expect(rejectionLog?.metadata).toMatchObject({ reason: 'Paiement illisible' });
  });

  it('sert une commande instantanee en un clic et reste idempotent sur double approbation', async () => {
    const admin = await createUser(prisma, {
      email: 'admin-delivery@test.tn',
      username: 'admin-delivery',
      role: 'ADMIN'
    });
    const client = await createUser(prisma, {
      email: 'client-delivery@test.tn',
      username: 'client-delivery',
      role: 'USER'
    });
    const category = await createCategory(prisma, 'Instant');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit instantane',
      slug: 'produit-instantane',
      price: 55,
      isInstant: true
    });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const order = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 55
    });

    await prisma.delivery.create({
      data: {
        orderId: order.id,
        orderItemId: order.items[0].id,
        status: 'READY',
        deliveryType: 'KEY',
        deliveryContentEncrypted: encryptDeliveryContent('KEY-123-456')
      }
    });

    const firstApprove = await request(app)
      .post(`/api/admin/orders/${order.id}/payment/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(firstApprove.status).toBe(200);
    expect(firstApprove.body.status).toBe('DELIVERED');
    expect(firstApprove.body.invoice.status).toBe('PAID');
    expect(firstApprove.body.payments[0].status).toBe('PAID');

    const secondApprove = await request(app)
      .post(`/api/admin/orders/${order.id}/payment/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(secondApprove.status).toBe(200);
    expect(secondApprove.body.status).toBe('DELIVERED');

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        deliveries: true,
        payments: true,
        invoice: true,
        actionLogs: true
      }
    });

    expect(persisted.status).toBe('DELIVERED');
    expect(persisted.payments[0].status).toBe('PAID');
    expect(persisted.deliveries).toHaveLength(1);
    expect(persisted.deliveries[0].status).toBe('SENT');
    expect(persisted.actionLogs.filter((log) => log.action === 'DELIVERY_SENT')).toHaveLength(1);
  });
});
