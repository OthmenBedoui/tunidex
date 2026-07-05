import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createPendingOrder, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Pagination and filtering integration', () => {
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

  it('pagine et filtre les commandes cote serveur', async () => {
    const admin = await createUser(prisma, { email: 'orders-admin@test.tn', username: 'orders-admin', role: 'ADMIN' });
    const client = await createUser(prisma, { email: 'orders-client@test.tn', username: 'orders-client', role: 'USER' });
    const category = await createCategory(prisma, 'Orders Pagination');
    const listing = await createListing(prisma, category.id, { title: 'Alpha search listing', slug: 'alpha-search-listing' });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const matching = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: 'Alpha keyword product',
      orderNumber: 'ALPHA-ORDER-001'
    });
    const nonMatching = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: 'Beta keyword product',
      orderNumber: 'BETA-ORDER-002'
    });

    await prisma.order.update({
      where: { id: nonMatching.id },
      data: { status: 'DELIVERED' }
    });

    const response = await request(app)
      .get('/api/orders/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 1, status: 'PAYMENT_UNDER_REVIEW', q: 'alpha', sort: 'newest' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.total).toBe(1);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.items[0].id).toBe(matching.id);
  });

  it('pagine et filtre les utilisateurs cote serveur', async () => {
    const admin = await createUser(prisma, { email: 'users-admin@test.tn', username: 'users-admin', role: 'ADMIN' });
    await createUser(prisma, { email: 'member-alpha@test.tn', username: 'member-alpha', role: 'USER' });
    await createUser(prisma, { email: 'agent-beta@test.tn', username: 'agent-beta', role: 'AGENT' });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 25, role: 'USER', q: 'member-alpha', sort: 'email-asc' });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].email).toBe('member-alpha@test.tn');
  });

  it('pagine et filtre les listings publics cote serveur', async () => {
    const category = await createCategory(prisma, 'Listings Pagination');
    await createListing(prisma, category.id, { title: 'Gamma Public', slug: 'gamma-public', price: 10 });
    await createListing(prisma, category.id, { title: 'Delta Public', slug: 'delta-public', price: 20 });

    const response = await request(app)
      .get('/api/listings')
      .query({ limit: 1, q: 'public', sort: 'title-asc' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.total).toBeGreaterThanOrEqual(2);
    expect(response.body.items[0].title).toBe('Delta Public');
    expect(response.body.nextCursor).toEqual(expect.any(String));
  });
});
