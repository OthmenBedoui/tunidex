import { z } from 'zod';
import { idParamsSchema, nonEmptyString, optionalImageUrlSchema, optionalTrimmedString } from './common.js';

export const blogPostParamsSchema = z.object({
  slug: z.string().trim().min(1, 'slug is required.').max(255, 'slug is too long.')
}).strict();

export const blogAdminIdParamsSchema = idParamsSchema;

export const blogPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  cursor: optionalTrimmedString(255),
  limit: z.coerce.number().int().positive().max(100).optional(),
  tag: optionalTrimmedString(80),
  sort: z.enum(['newest', 'oldest']).optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'all']).optional(),
  q: optionalTrimmedString(255)
}).strict();

export const blogPostBodySchema = z.object({
  title: nonEmptyString('title is required.', 255),
  slug: nonEmptyString('slug is required.', 255),
  excerpt: nonEmptyString('excerpt is required.', 600),
  content: nonEmptyString('content is required.', 50000),
  coverUrl: optionalImageUrlSchema(4000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  publishedAt: z.string().datetime().nullable().optional()
}).strict();

export const generateBlogDraftBodySchema = z.object({
  topic: nonEmptyString('topic is required.', 255)
}).strict();
