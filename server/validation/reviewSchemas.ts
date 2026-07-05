import { z } from 'zod';
import { idParamsSchema, nonEmptyString, uuidSchema } from './common.js';

export const listingReviewParamsSchema = idParamsSchema;
export const reviewIdParamsSchema = idParamsSchema;
export const reviewPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
}).strict();

export const createReviewBodySchema = z.object({
  listingId: uuidSchema,
  orderId: uuidSchema,
  rating: z.coerce.number().int().min(1).max(5),
  comment: nonEmptyString('Commentaire obligatoire.', 2000)
}).strict();

export const moderateReviewBodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'])
}).strict();
