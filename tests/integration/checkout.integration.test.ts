import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Checkout integration', () => {
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

  it('recalcule le total cote serveur pour le checkout connecte et initialise PAYMENT_UNDER_REVIEW', async () => {
    const user = await createUser(prisma, {
      email: 'checkout-user@test.tn',
      username: 'checkout-user',
      fullName: 'Checkout User',
      phone: '+21622000000',
    });
    const category = await createCategory(prisma, 'Checkout');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit panier',
      slug: 'produit-panier',
      price: 100,
    });
    const token = signAccessToken({ id: user.id, role: user.role });

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId: listing.id });
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId: listing.id });

    await prisma.listing.update({
      where: { id: listing.id },
      data: { price: 130 },
    });

    const response = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'whatsapp',
        idempotencyKey: `auth-checkout-${crypto.randomUUID()}`,
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PAYMENT_UNDER_REVIEW');
    expect(response.body.amount).toBe(260);
    expect(response.body.invoice.status).toBe('PENDING_PAYMENT');
    expect(response.body.payments[0].status).toBe('SUBMITTED');
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(2);

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: response.body.id },
      include: { invoice: true, payments: true },
    });
    expect(persistedOrder.amount).toBe(260);
    expect(persistedOrder.status).toBe('PAYMENT_UNDER_REVIEW');
    expect(persistedOrder.invoice?.status).toBe('PENDING_PAYMENT');
    expect(persistedOrder.payments[0].status).toBe('SUBMITTED');

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(0);
  });

  it('cree une commande invitee avec total calcule serveur et statut initial PAYMENT_UNDER_REVIEW', async () => {
    const category = await createCategory(prisma, 'Guest Checkout');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit invite',
      slug: 'produit-invite',
      price: 40,
    });

    const response = await request(app)
      .post('/api/checkout/guest')
      .send({
        firstName: 'Guest',
        lastName: 'Buyer',
        email: `guest-${crypto.randomUUID()}@test.tn`,
        phone: '+21633000000',
        paymentMethod: 'whatsapp',
        idempotencyKey: `guest-checkout-${crypto.randomUUID()}`,
        items: [
          {
            listingId: listing.id,
            quantity: 3,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PAYMENT_UNDER_REVIEW');
    expect(response.body.amount).toBe(120);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
    expect(response.body.payments[0].status).toBe('SUBMITTED');

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: response.body.id },
      include: { invoice: true, payments: true },
    });
    expect(persistedOrder.amount).toBe(120);
    expect(persistedOrder.status).toBe('PAYMENT_UNDER_REVIEW');
    expect(persistedOrder.invoice?.status).toBe('PENDING_PAYMENT');
    expect(persistedOrder.payments[0].status).toBe('SUBMITTED');
  });
});
