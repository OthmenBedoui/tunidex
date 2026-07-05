import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';
import { createCheckoutOrder } from '../../server/services/checkoutService.js';
import { processEmailOutbox } from '../../server/services/emailService.js';
import { sendOrderConfirmationEmail } from '../../server/services/orderEmailService.js';

describe('Invoices integration', () => {
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

  it('generates sequential invoice numbers without gaps for successful orders', async () => {
    const category = await createCategory(prisma, 'Invoices');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit facture',
      slug: 'produit-facture',
      price: 18
    });

    const first = await createCheckoutOrder({
      firstName: 'Fatma',
      lastName: 'Client',
      email: 'invoice-seq-1@test.tn',
      phone: '+21611111111',
      paymentMethod: 'bank_transfer',
      items: [{ listingId: listing.id, quantity: 1 }],
      source: 'GUEST'
    });

    const second = await createCheckoutOrder({
      firstName: 'Ali',
      lastName: 'Client',
      email: 'invoice-seq-2@test.tn',
      phone: '+21622222222',
      paymentMethod: 'bank_transfer',
      items: [{ listingId: listing.id, quantity: 1 }],
      source: 'GUEST'
    });

    expect(first.invoice?.invoiceNumber).toMatch(/^FAC-\d{4}-\d{6}$/);
    expect(second.invoice?.invoiceNumber).toMatch(/^FAC-\d{4}-\d{6}$/);

    const firstSequence = Number(first.invoice?.invoiceNumber.split('-').at(-1));
    const secondSequence = Number(second.invoice?.invoiceNumber.split('-').at(-1));

    expect(secondSequence - firstSequence).toBe(1);
  });

  it('only allows the owner or staff to download the invoice PDF', async () => {
    const owner = await createUser(prisma, {
      email: 'invoice-owner@test.tn',
      username: 'invoice-owner',
      role: 'USER'
    });
    const outsider = await createUser(prisma, {
      email: 'invoice-outsider@test.tn',
      username: 'invoice-outsider',
      role: 'USER'
    });
    const admin = await createUser(prisma, {
      email: 'invoice-admin@test.tn',
      username: 'invoice-admin',
      role: 'ADMIN'
    });
    const category = await createCategory(prisma, 'Invoices ACL');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit ACL',
      slug: 'produit-acl',
      price: 28
    });

    const order = await createCheckoutOrder({
      firstName: 'Owner',
      lastName: 'Client',
      email: owner.email,
      phone: '+21633333333',
      paymentMethod: 'd17',
      items: [{ listingId: listing.id, quantity: 1 }],
      userId: owner.id,
      source: 'AUTHENTICATED'
    });

    const ownerToken = signAccessToken({ id: owner.id, role: owner.role });
    const outsiderToken = signAccessToken({ id: outsider.id, role: outsider.role });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const anonymousResponse = await request(app)
      .get(`/api/orders/${order.id}/invoice.pdf`);

    expect(anonymousResponse.status).toBe(401);

    const ownerResponse = await request(app)
      .get(`/api/orders/${order.id}/invoice.pdf`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.headers['content-type']).toContain('application/pdf');
    expect(ownerResponse.headers['content-disposition']).toContain(order.invoice?.invoiceNumber || '');
    expect(ownerResponse.body instanceof Buffer).toBe(true);
    expect(ownerResponse.body.subarray(0, 4).toString()).toBe('%PDF');

    const outsiderResponse = await request(app)
      .get(`/api/orders/${order.id}/invoice.pdf`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(outsiderResponse.status).toBe(403);

    const adminResponse = await request(app)
      .get(`/api/orders/${order.id}/invoice.pdf`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.headers['content-type']).toContain('application/pdf');
  });

  it('queues confirmation emails with invoice PDF attachment and the outbox sends them successfully', async () => {
    const category = await createCategory(prisma, 'Invoices Email');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit email facture',
      slug: 'produit-email-facture',
      price: 21
    });

    const order = await createCheckoutOrder({
      firstName: 'Sarra',
      lastName: 'Client',
      email: 'invoice-email@test.tn',
      phone: '+21644444444',
      paymentMethod: 'bank_transfer',
      items: [{ listingId: listing.id, quantity: 1 }],
      source: 'GUEST'
    });

    const result = await sendOrderConfirmationEmail(order);
    expect(result.status).toBe('PENDING');

    const queued = await prisma.emailOutbox.findMany({
      where: { to: order.customerEmail },
      orderBy: { createdAt: 'asc' }
    });

    expect(queued).toHaveLength(2);
    expect(queued.every((item) => item.template === 'orderConfirmation' || item.template === 'invoice')).toBe(true);
    expect(queued.every((item) => (item.payload as Record<string, unknown>).attachInvoicePdf === true)).toBe(true);

    await processEmailOutbox();

    const sentItems = await prisma.emailOutbox.findMany({
      where: { to: order.customerEmail },
      orderBy: { createdAt: 'asc' }
    });

    expect(sentItems).toHaveLength(2);
    expect(sentItems.every((item) => item.status === 'SENT')).toBe(true);

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { invoice: true }
    });

    expect(persistedOrder.emailStatus).toBe('SENT');
    expect(persistedOrder.invoice?.emailSentAt).not.toBeNull();
    expect(persistedOrder.invoice?.emailError).toBeNull();
  });
});
