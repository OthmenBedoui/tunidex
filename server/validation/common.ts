import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

export const uuidSchema = z.string().uuid('Must be a valid UUID.');
export const emailSchema = z.string().trim().email('Must be a valid email address.').transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8, 'Password must contain at least 8 characters.').max(128, 'Password is too long.');
export const nonEmptyString = (message: string, max = 5000) => z.string().trim().min(1, message).max(max, `${message} (too long).`);
export const optionalTrimmedString = (max = 5000) => z.string().trim().max(max, 'Value is too long.').optional();
const rejectInlineImageData = (value: string) => !value.startsWith('data:image/');
export const imageUrlSchema = (max = 4000) => z.string().trim().min(1, 'Image URL is required.').max(max, 'Image URL is too long.').refine(rejectInlineImageData, 'Inline base64 images are not allowed.');
export const optionalImageUrlSchema = (max = 4000) => z.string().trim().max(max, 'Image URL is too long.').refine(rejectInlineImageData, 'Inline base64 images are not allowed.').optional();
export const phoneSchema = z.string().trim().min(8, 'Phone number is too short.').max(32, 'Phone number is too long.');
export const roleSchema = z.enum(ROLES);
export const paymentMethodSchema = z.string().trim().min(1, 'Payment method is required.').max(64, 'Payment method is too long.').optional();
export const idempotencyKeySchema = z.string().trim().min(1, 'Idempotency key cannot be empty.').max(255, 'Idempotency key is too long.').optional();
export const paymentProofSchema = z.object({
  fileName: z.string().trim().min(1, 'fileName is required.').max(255, 'fileName is too long.'),
  mimeType: z.string().trim().min(1, 'mimeType is required.').max(100, 'mimeType is too long.'),
  size: z.number().positive('size must be greater than 0.'),
  dataUrl: z.string().trim().min(1, 'dataUrl is required.')
}).strict();

export const idParamsSchema = z.object({
  id: uuidSchema
}).strict();
