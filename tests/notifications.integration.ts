import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://tunibots:57575c65126c53c91b6605cb98f4157b8b6dfb8f0fdda1c3@127.0.0.1:5432/tunibots_test';

const run = (command: string, env?: NodeJS.ProcessEnv) =>
  execSync(command, {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env, ...env }
  }).toString().trim();

const createAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const jsonFetch = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data: data as T };
};

const main = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.JWT_SECRET = '12345678901234567890123456789012';
  process.env.AUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
  process.env.AUTH_URL = 'http://127.0.0.1:3000';
  process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:3000';

  let prisma: typeof import('../server/prisma.js').default | null = null;
  let server: import('node:http').Server | null = null;

  try {
    run('npx prisma migrate reset --force --skip-seed --schema server/schema.prisma', {
      DATABASE_URL,
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET,
      AUTH_SECRET: process.env.AUTH_SECRET,
      AUTH_URL: process.env.AUTH_URL,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    });

    const [{ default: prismaClient }, { createApp }, { signAccessToken }] = await Promise.all([
      import('../server/prisma.js'),
      import('../server/app.js'),
      import('../server/services/authTokenService.js')
    ]);
    prisma = prismaClient;

    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    const [admin, agent, otherAdmin, client] = await Promise.all([
      prisma.user.create({
        data: {
          email: 'admin1@test.tn',
          username: 'admin1',
          password: passwordHash,
          role: 'ADMIN',
          emailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'agent1@test.tn',
          username: 'agent1',
          password: passwordHash,
          role: 'AGENT',
          emailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'admin2@test.tn',
          username: 'admin2',
          password: passwordHash,
          role: 'ADMIN',
          emailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'client@test.tn',
          username: 'client1',
          password: passwordHash,
          role: 'USER',
          emailVerified: true
        }
      })
    ]);

    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        icon: 'Box'
      }
    });

    const listing = await prisma.listing.create({
      data: {
        title: 'Notification Test Product',
        slug: 'notification-test-product',
        description: 'Test listing',
        price: 25,
        categoryId: category.id,
        imageUrl: 'https://example.com/product.png'
      }
    });

    const app = await createApp();
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve test server address.');
    }
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const adminToken = signAccessToken({ id: admin.id, role: admin.role });
    const agentToken = signAccessToken({ id: agent.id, role: agent.role });
    const otherAdminToken = signAccessToken({ id: otherAdmin.id, role: otherAdmin.role });
    const clientToken = signAccessToken({ id: client.id, role: client.role });

    const guestCheckoutPayload = (idempotencyKey: string) => ({
      firstName: 'Guest',
      lastName: 'Buyer',
      email: `guest+${idempotencyKey}@test.tn`,
      phone: '+21612345678',
      paymentMethod: 'whatsapp',
      idempotencyKey,
      items: [
        {
          listingId: listing.id,
          quantity: 1
        }
      ]
    });

    const firstCheckout = await jsonFetch<{ id: string }>(`${baseUrl}/checkout/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestCheckoutPayload('idem-order-1'))
    });
    assert.equal(firstCheckout.response.status, 201, 'guest checkout should succeed');
    const firstOrderId = firstCheckout.data.id;

    let staffNotifications = await prisma.notification.findMany({
      where: {
        orderId: firstOrderId,
        type: 'ORDER_CREATED'
      },
      orderBy: { recipientId: 'asc' }
    });
    assert.equal(staffNotifications.length, 3, 'one ORDER_CREATED notification should be created per admin/agent');

    const replayCheckout = await jsonFetch<{ id: string }>(`${baseUrl}/checkout/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestCheckoutPayload('idem-order-1'))
    });
    assert.equal(replayCheckout.response.status, 201, 'replayed guest checkout should remain successful');

    staffNotifications = await prisma.notification.findMany({
      where: {
        orderId: firstOrderId,
        type: 'ORDER_CREATED'
      }
    });
    assert.equal(staffNotifications.length, 3, 'replaying the same ORDER_CREATED event must not create duplicates');

    const adminNotification = await prisma.notification.findFirstOrThrow({
      where: {
        orderId: firstOrderId,
        recipientId: admin.id,
        type: 'ORDER_CREATED'
      }
    });
    assert.equal(adminNotification.readAt, null, 'fresh admin notification must start unread');

    const unauthorizedRead = await jsonFetch<{ error: string }>(`${baseUrl}/notifications/${adminNotification.id}/read`, {
      method: 'PATCH',
      headers: createAuthHeader(agentToken)
    });
    assert.equal(unauthorizedRead.response.status, 404, 'another user cannot mark a notification they do not own');

    const unchangedNotification = await prisma.notification.findUniqueOrThrow({ where: { id: adminNotification.id } });
    assert.equal(unchangedNotification.readAt, null, 'unauthorized read must not modify readAt');

    const authorizedRead = await jsonFetch<{ readAt: string | null; read: boolean }>(`${baseUrl}/notifications/${adminNotification.id}/read`, {
      method: 'PATCH',
      headers: createAuthHeader(adminToken)
    });
    assert.equal(authorizedRead.response.status, 200, 'recipient should be able to mark their notification as read');
    assert.equal(authorizedRead.data.read, true, 'notification payload should report read=true after PATCH');
    assert.ok(authorizedRead.data.readAt, 'notification payload should expose readAt after PATCH');

    const readNotification = await prisma.notification.findUniqueOrThrow({ where: { id: adminNotification.id } });
    assert.ok(readNotification.readAt, 'readAt should be persisted for the recipient');

    await jsonFetch(`${baseUrl}/checkout/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestCheckoutPayload('idem-order-2'))
    });
    await jsonFetch(`${baseUrl}/checkout/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestCheckoutPayload('idem-order-3'))
    });

    const unreadBeforeReadAll = await jsonFetch<{ count: number }>(`${baseUrl}/notifications/unread-count`, {
      headers: createAuthHeader(adminToken)
    });
    assert.equal(unreadBeforeReadAll.response.status, 200, 'unread-count should be accessible');
    assert.equal(unreadBeforeReadAll.data.count, 2, 'admin should have exactly two unread notifications before read-all');

    const markAll = await jsonFetch<{ updated: number }>(`${baseUrl}/notifications/read-all`, {
      method: 'POST',
      headers: createAuthHeader(adminToken)
    });
    assert.equal(markAll.response.status, 200, 'read-all should succeed');
    assert.equal(markAll.data.updated, 2, 'read-all should return the number of updated notifications');

    const unreadAfterReadAll = await jsonFetch<{ count: number }>(`${baseUrl}/notifications/unread-count`, {
      headers: createAuthHeader(adminToken)
    });
    assert.equal(unreadAfterReadAll.data.count, 0, 'unread-count should drop to 0 after read-all');

    const orderForApproval = await prisma.order.create({
      data: {
        orderNumber: 'CMD-TEST-APPROVE',
        userId: client.id,
        status: 'PAYMENT_UNDER_REVIEW',
        amount: 30,
        subtotal: 30,
        discount: 0,
        total: 30,
        currency: 'TND',
        source: 'AUTHENTICATED',
        customerType: 'USER',
        customerFirstName: 'Client',
        customerLastName: 'Approved',
        customerEmail: client.email,
        customerPhone: '+21698765432',
        paymentMethod: 'whatsapp',
        items: {
          create: {
            listingId: listing.id,
            quantity: 1,
            priceSnapshot: 30,
            titleSnapshot: listing.title,
            deliveryType: 'MIXED',
            status: 'LOCKED'
          }
        },
        payments: {
          create: {
            userId: client.id,
            method: 'whatsapp',
            status: 'SUBMITTED',
            amount: 30,
            currency: 'TND',
            submittedAt: new Date()
          }
        },
        invoice: {
          create: {
            invoiceNumber: 'FAC-TEST-APPROVE',
            type: 'PROFORMA',
            status: 'PENDING_PAYMENT',
            currency: 'TND',
            orderNumber: 'CMD-TEST-APPROVE',
            customerFirstName: 'Client',
            customerLastName: 'Approved',
            customerEmail: client.email,
            customerPhone: '+21698765432',
            totalAmount: 30
          }
        }
      }
    });

    const approvePayment = await jsonFetch(`${baseUrl}/admin/orders/${orderForApproval.id}/payment/approve`, {
      method: 'POST',
      headers: createAuthHeader(otherAdminToken)
    });
    assert.equal(approvePayment.response.status, 200, 'approveOrderPayment should succeed for staff');

    const approvedClientNotifications = await prisma.notification.findMany({
      where: {
        recipientId: client.id,
        orderId: orderForApproval.id,
        type: 'PAYMENT_APPROVED'
      }
    });
    assert.equal(approvedClientNotifications.length, 1, 'approveOrderPayment should notify the intended client exactly once');

    const wrongClientNotifications = await prisma.notification.findMany({
      where: {
        recipientId: { not: client.id },
        orderId: orderForApproval.id,
        type: 'PAYMENT_APPROVED',
        audience: 'CLIENT'
      }
    });
    assert.equal(wrongClientNotifications.length, 0, 'approveOrderPayment must not notify unrelated clients');

    const clientUnreadCount = await jsonFetch<{ count: number }>(`${baseUrl}/notifications/unread-count`, {
      headers: createAuthHeader(clientToken)
    });
    assert.equal(clientUnreadCount.data.count, 1, 'the approved client should see one unread PAYMENT_APPROVED notification');

    console.log('✓ ORDER_CREATED fan-out is deduplicated per admin/agent');
    console.log('✓ Notification read ownership and readAt persistence are enforced');
    console.log('✓ read-all updates the correct count and unread-count returns 0 afterwards');
    console.log('✓ approveOrderPayment notifies only the intended client');
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
