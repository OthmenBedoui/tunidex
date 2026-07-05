import { z } from 'zod';

export const authProviderKeyParamsSchema = z.object({
  providerKey: z.enum([
    'email-password',
    'google',
    'facebook',
    'apple',
    'discord',
    'github',
    'microsoft'
  ])
}).strict();

export const updateAuthProviderBodySchema = z.object({
  enabled: z.boolean().optional(),
  updates: z.record(z.string(), z.string()).optional(),
  clearFields: z.array(z.string()).optional()
}).strict();
