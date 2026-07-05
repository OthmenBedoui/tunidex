import { z } from 'zod';
import { emailSchema, nonEmptyString, optionalImageUrlSchema, optionalTrimmedString, passwordSchema, phoneSchema } from './common.js';

export const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema
}).strict();

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: nonEmptyString('Username is required.', 80),
  fullName: nonEmptyString('Full name is required.', 120),
  address: nonEmptyString('Address is required.', 500),
  phone: phoneSchema,
  paymentMethod: optionalTrimmedString(50),
  whatsappNumber: optionalTrimmedString(32),
  whatsappBotId: optionalTrimmedString(64),
  whatsappOptIn: z.boolean().optional()
}).strict();

export const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must contain exactly 6 digits.')
}).strict();

export const resendOtpBodySchema = z.object({
  email: emailSchema
}).strict();

export const emailChangeRequestBodySchema = z.object({
  newEmail: emailSchema
}).strict();

export const emailChangeConfirmBodySchema = z.object({
  newEmail: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must contain exactly 6 digits.')
}).strict();

export const updateProfileBodySchema = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(80, 'Username is too long.').optional(),
  avatarUrl: optionalImageUrlSchema(),
  password: passwordSchema.optional(),
  fullName: optionalTrimmedString(120),
  address: optionalTrimmedString(500),
  phone: optionalTrimmedString(32),
  paymentMethod: optionalTrimmedString(50),
  whatsappNumber: optionalTrimmedString(32)
}).strict();

export const updateSubscriptionBodySchema = z.object({
  tier: z.enum(['Free', 'Pro', 'Elite']),
  fullName: nonEmptyString('Full name is required.', 120),
  address: nonEmptyString('Address is required.', 500),
  phone: phoneSchema,
  paymentMethod: nonEmptyString('Payment method is required.', 50),
  whatsappNumber: optionalTrimmedString(32),
  whatsappBotId: optionalTrimmedString(64),
  whatsappOptIn: z.boolean().optional()
}).strict();

export const deleteAccountBodySchema = z.object({
  confirmation: z.string().trim().min(1, 'Confirmation is required.').max(50, 'Confirmation is too long.')
}).strict();
