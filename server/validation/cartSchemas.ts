import { z } from 'zod';
import { emailSchema, idempotencyKeySchema, nonEmptyString, optionalTrimmedString, paymentMethodSchema, paymentProofSchema, phoneSchema, uuidSchema } from './common.js';

const checkoutItemSchema = z.object({
  listingId: uuidSchema,
  variantId: uuidSchema.optional(),
  quantity: z.coerce.number().int('Quantity must be an integer.').positive('Quantity must be greater than 0.')
}).strict();

export const cartItemParamsSchema = z.object({
  itemId: uuidSchema
}).strict();

export const notificationParamsSchema = z.object({
  notificationId: uuidSchema
}).strict();

export const addToCartBodySchema = z.object({
  listingId: uuidSchema,
  variantId: uuidSchema.optional()
}).strict();

export const checkoutBodySchema = z.object({
  phone: phoneSchema.optional(),
  paymentMethod: paymentMethodSchema,
  useLoyaltyPoints: z.boolean().optional(),
  couponCode: optionalTrimmedString(64),
  customerReference: optionalTrimmedString(120),
  paymentProof: paymentProofSchema.nullable().optional(),
  idempotencyKey: idempotencyKeySchema
}).strict();

export const guestCheckoutBodySchema = z.object({
  firstName: nonEmptyString('First name is required.', 80),
  lastName: nonEmptyString('Last name is required.', 80),
  email: emailSchema,
  phone: phoneSchema,
  paymentMethod: paymentMethodSchema,
  useLoyaltyPoints: z.boolean().optional(),
  couponCode: optionalTrimmedString(64),
  customerReference: optionalTrimmedString(120),
  paymentProof: paymentProofSchema.nullable().optional(),
  idempotencyKey: idempotencyKeySchema,
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required.')
}).strict();

export const confirmCheckoutBodySchema = z.object({
  firstName: optionalTrimmedString(80),
  lastName: optionalTrimmedString(80),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  paymentMethod: paymentMethodSchema,
  useLoyaltyPoints: z.boolean().optional(),
  couponCode: optionalTrimmedString(64),
  customerReference: optionalTrimmedString(120),
  paymentProof: paymentProofSchema.nullable().optional(),
  idempotencyKey: idempotencyKeySchema,
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required.').optional()
}).strict();

export const validateCouponBodySchema = z.object({
  couponCode: optionalTrimmedString(64),
  subtotal: z.coerce.number().nonnegative('Subtotal must be positive or zero.')
}).strict();

export const submitPaymentProofBodySchema = z.object({
  email: emailSchema.optional(),
  reference: optionalTrimmedString(120),
  proofUrl: optionalTrimmedString(4000),
  paymentMethod: paymentMethodSchema,
  proofMessage: optionalTrimmedString(500)
}).strict().refine((value) => Boolean(value.reference || value.proofUrl), {
  message: 'A payment proof image or transaction reference is required.',
  path: ['proofUrl']
});
