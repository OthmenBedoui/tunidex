import { z } from 'zod';

export const generateDescriptionBodySchema = z.object({
  game: z.string().trim().min(1, 'game is required.').max(120, 'game is too long.'),
  itemType: z.string().trim().min(1, 'itemType is required.').max(120, 'itemType is too long.'),
  keyFeatures: z.string().trim().min(1, 'keyFeatures is required.').max(5000, 'keyFeatures is too long.')
}).strict();

export const generateBlogDraftBodySchema = z.object({
  topic: z.string().trim().min(1, 'topic is required.').max(255, 'topic is too long.')
}).strict();
