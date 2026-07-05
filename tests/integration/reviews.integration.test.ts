import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createPendingOrder, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Reviews integration', () => {
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

  it('requires a delivered purchase and only exposes approved reviews publicly', async () => {
    const admin = await createUser(prisma, {
      email: 'reviews-admin@test.tn',
      username: 'reviews-admin',
      role: 'ADMIN'
    });
    const client = await createUser(prisma, {
      email: 'reviews-client@test.tn',
      username: 'reviews-client',
      role: 'USER'
    });
    const category = await createCategory(prisma, 'Reviews');
    const listing = await createListing(prisma, category.id, {
      title: 'Produit avis',
      slug: 'produit-avis',
      price: 42
    });

    const clientToken = signAccessToken({ id: client.id, role: client.role });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const undeliveredOrder = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 42
    });

    const forbiddenReview = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        listingId: listing.id,
        orderId: undeliveredOrder.id,
        rating: 4,
        comment: 'Rapide et propre.'
      });

    expect(forbiddenReview.status).toBe(403);

    const deliveredOrder = await createPendingOrder(prisma, {
      userId: client.id,
      userEmail: client.email,
      listingId: listing.id,
      titleSnapshot: listing.title,
      amount: 42
    });

    await prisma.order.update({
      where: { id: deliveredOrder.id },
      data: {
        status: 'DELIVERED',
        payments: {
          updateMany: {
            where: { orderId: deliveredOrder.id },
            data: { status: 'PAID' }
          }
        }
      }
    });

    const createReview = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        listingId: listing.id,
        orderId: deliveredOrder.id,
        rating: 5,
        comment: 'Produit reçu rapidement, activation simple.'
      });

    expect(createReview.status).toBe(201);
    expect(createReview.body.status).toBe('PENDING');

    const publicBeforeApproval = await request(app).get(`/api/listings/${listing.id}/reviews`);
    expect(publicBeforeApproval.status).toBe(200);
    expect(publicBeforeApproval.body.items).toHaveLength(0);
    expect(publicBeforeApproval.body.summary.count).toBe(0);

    const pendingReviews = await request(app)
      .get('/api/admin/reviews/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pendingReviews.status).toBe(200);
    expect(pendingReviews.body.items).toHaveLength(1);
    expect(pendingReviews.body.items[0].listing.id).toBe(listing.id);

    const approveReview = await request(app)
      .patch(`/api/admin/reviews/${createReview.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(approveReview.status).toBe(200);
    expect(approveReview.body.status).toBe('APPROVED');

    const publicAfterApproval = await request(app).get(`/api/listings/${listing.id}/reviews`);
    expect(publicAfterApproval.status).toBe(200);
    expect(publicAfterApproval.body.items).toHaveLength(1);
    expect(publicAfterApproval.body.items[0].comment).toContain('Produit reçu rapidement');
    expect(publicAfterApproval.body.summary.count).toBe(1);
    expect(publicAfterApproval.body.summary.average).toBe(5);

    const listingsResponse = await request(app).get('/api/listings');
    expect(listingsResponse.status).toBe(200);
    const ratedListing = listingsResponse.body.items.find((item: any) => item.id === listing.id);
    expect(ratedListing.ratingCount).toBe(1);
    expect(ratedListing.ratingAverage).toBe(5);
  });
});
