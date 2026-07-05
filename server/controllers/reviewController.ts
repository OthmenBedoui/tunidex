import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { buildNextCursor, resolvePagination } from '../utils/pagination.js';
import { attachReviewSummariesToListings, REVIEWABLE_ORDER_STATUSES, serializeReview } from '../services/reviewService.js';

type AuthRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

export const createReview = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const { listingId, orderId, rating, comment } = req.body;

  const deliveredOrder = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: { in: REVIEWABLE_ORDER_STATUSES },
      items: {
        some: { listingId }
      }
    },
    include: {
      items: true
    }
  });

  if (!deliveredOrder) {
    return res.status(403).json({ error: "Impossible de laisser un avis sans achat livre pour ce produit." });
  }

  const existing = await prisma.review.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId
      }
    }
  });

  if (existing) {
    return res.status(409).json({ error: 'Vous avez deja laisse un avis pour ce produit.' });
  }

  const review = await prisma.review.create({
    data: {
      userId,
      listingId,
      orderId,
      rating: Number(rating),
      comment
    },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      listing: { select: { id: true, title: true, slug: true, imageUrl: true } },
      order: { select: { id: true, orderNumber: true } }
    }
  });

  res.status(201).json(serializeReview(review));
};

export const getListingReviews = async (req: Request, res: Response) => {
  const listingId = req.params.id;
  const { page, limit, skip } = resolvePagination(req.query);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true }
  });

  if (!listing) {
    return res.status(404).json({ error: 'Produit introuvable.' });
  }

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { listingId, status: 'APPROVED' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        order: { select: { id: true, orderNumber: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    }),
    prisma.review.count({
      where: { listingId, status: 'APPROVED' }
    })
  ]);
  const listingsWithSummary = await attachReviewSummariesToListings([{ id: listingId }]);

  res.json({
    items: reviews.map(serializeReview),
    total,
    nextCursor: buildNextCursor(page, limit, total),
    summary: {
      average: listingsWithSummary[0]?.ratingAverage || 0,
      count: listingsWithSummary[0]?.ratingCount || 0
    }
  });
};

export const getPendingReviews = async (req: Request, res: Response) => {
  const { page, limit, skip } = resolvePagination(req.query);

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, slug: true, imageUrl: true } },
        order: { select: { id: true, orderNumber: true } }
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip,
      take: limit
    }),
    prisma.review.count({ where: { status: 'PENDING' } })
  ]);

  res.json({
    items: reviews.map(serializeReview),
    total,
    nextCursor: buildNextCursor(page, limit, total)
  });
};

export const moderateReview = async (req: Request, res: Response) => {
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      listing: { select: { id: true, title: true, slug: true, imageUrl: true } },
      order: { select: { id: true, orderNumber: true } }
    }
  });

  res.json(serializeReview(review));
};
