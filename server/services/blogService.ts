import prisma from '../prisma.js';
import { buildNextCursor, resolvePagination, type PaginationQuery } from '../utils/pagination.js';

const parseGallery = (value: string | null) => {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
};

const serializeRelatedListing = (listing: {
  gallery: string | null;
  [key: string]: unknown;
}) => ({
  ...listing,
  gallery: parseGallery(listing.gallery)
});

export const serializeBlogPost = (post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string | null;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | string;
  publishedAt: Date | null;
  authorId: string;
  author?: { id: string; username: string; email: string; avatarUrl: string } | null;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  relatedListings?: Array<{ gallery: string | null; [key: string]: unknown }>;
}) => ({
  ...post,
  relatedListings: (post.relatedListings || []).map(serializeRelatedListing)
});

const buildRelatedListings = async (tags: string[]) => {
  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  const orFilters = normalizedTags.flatMap((tag) => ([
    { title: { contains: tag, mode: 'insensitive' as const } },
    { game: { contains: tag, mode: 'insensitive' as const } },
    { keywords: { contains: tag, mode: 'insensitive' as const } }
  ]));

  const related = await prisma.listing.findMany({
    where: {
      isArchived: false,
      ...(orFilters.length > 0 ? { OR: orFilters } : {})
    },
    orderBy: [{ salesCount: 'desc' }, { createdAt: 'desc' }],
    take: 4
  });

  if (related.length > 0 || orFilters.length === 0) {
    return related;
  }

  return prisma.listing.findMany({
    where: { isArchived: false },
    orderBy: [{ salesCount: 'desc' }, { createdAt: 'desc' }],
    take: 4
  });
};

export const listPublicBlogPosts = async (query: PaginationQuery & { tag?: string; sort?: 'newest' | 'oldest' }) => {
  const { page, limit, skip } = resolvePagination(query);
  const sort = query.sort === 'oldest' ? 'asc' : 'desc';
  const tag = query.tag?.trim();

  const where = {
    status: 'PUBLISHED' as const,
    ...(tag ? { tags: { has: tag } } : {})
  };

  const [items, total] = await prisma.$transaction([
    prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      },
      orderBy: [
        { publishedAt: sort },
        { createdAt: sort }
      ],
      skip,
      take: limit
    }),
    prisma.blogPost.count({ where })
  ]);

  return {
    items: items.map(serializeBlogPost),
    total,
    nextCursor: buildNextCursor(page, limit, total)
  };
};

export const listAdminBlogPosts = async (query: PaginationQuery & {
  status?: 'PUBLISHED' | 'DRAFT' | 'all';
  q?: string;
  sort?: 'newest' | 'oldest';
}) => {
  const { page, limit, skip } = resolvePagination(query);
  const sort = query.sort === 'oldest' ? 'asc' : 'desc';
  const q = query.q?.trim();

  const where = {
    ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { excerpt: { contains: q, mode: 'insensitive' as const } },
        { slug: { contains: q, mode: 'insensitive' as const } },
        { tags: { has: q } }
      ]
    } : {})
  };

  const [items, total] = await prisma.$transaction([
    prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      },
      orderBy: [
        { updatedAt: sort },
        { createdAt: sort }
      ],
      skip,
      take: limit
    }),
    prisma.blogPost.count({ where })
  ]);

  return {
    items: items.map(serializeBlogPost),
    total,
    nextCursor: buildNextCursor(page, limit, total)
  };
};

export const getPublicBlogPostBySlug = async (slug: string) => {
  const post = await prisma.blogPost.findFirst({
    where: {
      slug,
      status: 'PUBLISHED'
    },
    include: {
      author: {
        select: { id: true, username: true, email: true, avatarUrl: true }
      }
    }
  });

  if (!post) return null;

  await prisma.blogPost.update({
    where: { id: post.id },
    data: { views: { increment: 1 } }
  });

  const relatedListings = await buildRelatedListings(post.tags);
  return serializeBlogPost({
    ...post,
    views: post.views + 1,
    relatedListings
  });
};

export const createBlogPost = async (authorId: string, input: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl?: string | null;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string | null;
}) => {
  const status = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const publishedAt = status === 'PUBLISHED'
    ? (input.publishedAt ? new Date(input.publishedAt) : new Date())
    : null;

  const post = await prisma.blogPost.create({
    data: {
      title: input.title.trim(),
      slug: input.slug.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
      coverUrl: input.coverUrl?.trim() || null,
      tags: (input.tags || []).map((tag) => tag.trim()).filter(Boolean),
      status,
      publishedAt,
      authorId
    },
    include: {
      author: {
        select: { id: true, username: true, email: true, avatarUrl: true }
      }
    }
  });

  return serializeBlogPost(post);
};

export const updateBlogPost = async (postId: string, input: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl?: string | null;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string | null;
}) => {
  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) return null;

  const status = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const publishedAt = status === 'PUBLISHED'
    ? (input.publishedAt ? new Date(input.publishedAt) : existing.publishedAt || new Date())
    : null;

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title: input.title.trim(),
      slug: input.slug.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
      coverUrl: input.coverUrl?.trim() || null,
      tags: (input.tags || []).map((tag) => tag.trim()).filter(Boolean),
      status,
      publishedAt
    },
    include: {
      author: {
        select: { id: true, username: true, email: true, avatarUrl: true }
      }
    }
  });

  return serializeBlogPost(post);
};

export const deleteBlogPost = async (postId: string) => {
  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) return false;
  await prisma.blogPost.delete({ where: { id: postId } });
  return true;
};
