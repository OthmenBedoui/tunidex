import { z } from 'zod';
import { optionalTrimmedString, uuidSchema } from './common.js';

export const trackVisitBodySchema = z.object({
  path: z.string().trim().min(1, 'path is required.').max(500, 'path is too long.'),
  pageType: z.string().trim().min(1, 'pageType is required.').max(80, 'pageType is too long.'),
  listingId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  visitorId: optionalTrimmedString(120),
  referrer: optionalTrimmedString(500)
}).strict();
