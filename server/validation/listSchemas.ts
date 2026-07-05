import { z } from 'zod';
import { paginationConfig } from '../utils/pagination.js';
import { optionalTrimmedString, roleSchema } from './common.js';

const paginationQueryShape = {
  page: z.coerce.number().int().min(1).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(paginationConfig.maxLimit).optional()
} as const;

export const adminOrdersQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.enum([
    'PENDING_PAYMENT',
    'PAYMENT_UNDER_REVIEW',
    'PAYMENT_APPROVED',
    'PAID',
    'PAYMENT_REJECTED',
    'IN_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'IN_PROGRESS',
    'PAYMENT_RECEIVED',
    'CANCELLED',
    'REFUNDED'
  ]).optional(),
  q: optionalTrimmedString(200),
  sort: z.enum(['newest', 'oldest', 'amount-desc', 'amount-asc']).optional()
}).strict();

export const adminUsersQuerySchema = z.object({
  ...paginationQueryShape,
  role: roleSchema.optional(),
  q: optionalTrimmedString(200),
  sort: z.enum(['newest', 'oldest', 'email-asc', 'email-desc', 'balance-desc', 'balance-asc']).optional()
}).strict();

export const listingsQuerySchema = z.object({
  ...paginationQueryShape,
  q: optionalTrimmedString(200),
  sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc', 'title-asc', 'title-desc']).optional(),
  scope: z.enum(['public', 'all', 'archived']).optional()
}).strict();
