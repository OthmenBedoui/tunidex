import { z } from 'zod';
import { idParamsSchema, imageUrlSchema, optionalImageUrlSchema, optionalTrimmedString, uuidSchema } from './common.js';

const variantSchema = z.object({
  name: z.string().trim().min(1, 'Variant name is required.').max(120, 'Variant name is too long.'),
  price: z.coerce.number().nonnegative('Variant price must be positive or zero.'),
  order: z.coerce.number().int('Variant order must be an integer.').optional()
}).strict();

const packageItemSchema = z.object({
  includedListingId: uuidSchema,
  quantity: z.coerce.number().int('Package quantity must be an integer.').positive('Package quantity must be greater than 0.')
}).strict();

const listingBodySchema = z.object({
  game: optionalTrimmedString(120),
  title: z.string().trim().min(1, 'Title is required.').max(255, 'Title is too long.'),
  categoryId: uuidSchema,
  subCategoryId: uuidSchema.optional().nullable(),
  description: z.string().trim().min(1, 'Description is required.').max(100000, 'Description is too long.'),
  price: z.coerce.number().nonnegative('Price must be positive or zero.'),
  source: optionalTrimmedString(1000),
  variantLabel: optionalTrimmedString(120),
  discountPercent: z.coerce.number().int().min(0).max(95).optional(),
  discountType: z.enum(['NONE', 'PERCENT', 'AMOUNT']).optional(),
  discountValue: z.coerce.number().nonnegative('Discount value must be positive or zero.').optional(),
  imageUrl: imageUrlSchema(),
  cardTemplate: optionalTrimmedString(50),
  logoUrl: optionalImageUrlSchema(),
  stock: z.coerce.number().int('Stock must be an integer.').min(0, 'Stock must be positive or zero.'),
  isPackage: z.boolean().optional(),
  packageItems: z.array(packageItemSchema).optional(),
  deliveryTimeHours: z.coerce.number().int().min(0).max(8760),
  metaTitle: optionalTrimmedString(255),
  metaDesc: optionalTrimmedString(2000),
  keywords: optionalTrimmedString(2000),
  gallery: z.array(imageUrlSchema()).optional(),
  isInstant: z.boolean().optional(),
  preparationTime: optionalTrimmedString(120),
  platform: optionalTrimmedString(120),
  region: optionalTrimmedString(120),
  activationCountry: optionalTrimmedString(120),
  activationGuideTitle: optionalTrimmedString(255),
  activationGuideContent: optionalTrimmedString(100000),
  restrictionsTitle: optionalTrimmedString(255),
  restrictionsContent: optionalTrimmedString(100000),
  regionTitle: optionalTrimmedString(255),
  regionContent: optionalTrimmedString(100000),
  systemRequirementsEnabled: z.boolean().optional(),
  systemRequirementsPlatform: optionalTrimmedString(120),
  minimumOs: optionalTrimmedString(255),
  minimumMemory: optionalTrimmedString(255),
  minimumStorage: optionalTrimmedString(255),
  minimumProcessor: optionalTrimmedString(255),
  minimumGraphics: optionalTrimmedString(255),
  recommendedOs: optionalTrimmedString(255),
  recommendedMemory: optionalTrimmedString(255),
  recommendedStorage: optionalTrimmedString(255),
  recommendedProcessor: optionalTrimmedString(255),
  recommendedGraphics: optionalTrimmedString(255),
  variants: z.array(variantSchema).optional()
}).strict();

export const listingParamsSchema = idParamsSchema;
export const createListingBodySchema = listingBodySchema;
export const updateListingBodySchema = listingBodySchema;

export const categoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(120, 'Category name is too long.'),
  slug: z.string().trim().min(1, 'Category slug is required.').max(120, 'Category slug is too long.'),
  icon: z.string().trim().min(1, 'Category icon is required.').max(120, 'Category icon is too long.'),
  imageUrl: optionalImageUrlSchema(),
  gradient: optionalTrimmedString(255),
  description: optionalTrimmedString(5000),
  order: z.coerce.number().int().min(0).optional()
}).strict();

export const categoryParamsSchema = idParamsSchema;
export const createCategoryBodySchema = categoryBodySchema;
export const updateCategoryBodySchema = categoryBodySchema;

export const subCategoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Subcategory name is required.').max(120, 'Subcategory name is too long.'),
  slug: z.string().trim().min(1, 'Subcategory slug is required.').max(120, 'Subcategory slug is too long.'),
  categoryId: uuidSchema.optional(),
  icon: optionalTrimmedString(120),
  description: optionalTrimmedString(5000),
  order: z.coerce.number().int().min(0).optional()
}).strict();

export const subCategoryParamsSchema = idParamsSchema;
export const createSubCategoryBodySchema = subCategoryBodySchema.extend({
  categoryId: uuidSchema
}).strict();
export const updateSubCategoryBodySchema = subCategoryBodySchema;
