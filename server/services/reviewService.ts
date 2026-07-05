import prisma from '../prisma.js';

export const REVIEWABLE_ORDER_STATUSES = ['DELIVERED', 'COMPLETED'];

export const serializeReview = (review: any) => ({
  ...review,
  user: review.user
    ? {
        id: review.user.id,
        username: review.user.username,
        avatarUrl: review.user.avatarUrl
      }
    : undefined,
  listing: review.listing
    ? {
        id: review.listing.id,
        title: review.listing.title,
        slug: review.listing.slug,
        imageUrl: review.listing.imageUrl
      }
    : undefined,
  order: review.order
    ? {
        id: review.order.id,
        orderNumber: review.order.orderNumber
      }
    : undefined
});

export const getListingReviewSummaries = async (listingIds: string[]) => {
  if (listingIds.length === 0) return new Map<string, { average: number; count: number }>();

  const grouped = await prisma.review.groupBy({
    by: ['listingId'],
    where: {
      listingId: { in: listingIds },
      status: 'APPROVED'
    },
    _avg: { rating: true },
    _count: { _all: true }
  });

  return new Map(
    grouped.map((entry) => [
      entry.listingId,
      {
        average: Number((entry._avg.rating || 0).toFixed(1)),
        count: entry._count._all
      }
    ])
  );
};

export const attachReviewSummariesToListings = async <T extends { id: string }>(listings: T[]) => {
  const summaries = await getListingReviewSummaries(listings.map((listing) => listing.id));
  return listings.map((listing) => {
    const summary = summaries.get(listing.id);
    return {
      ...listing,
      ratingAverage: summary?.average || 0,
      ratingCount: summary?.count || 0
    };
  });
};
