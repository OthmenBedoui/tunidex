import { z } from 'zod';
import { idParamsSchema, nonEmptyString, optionalImageUrlSchema, optionalTrimmedString, roleSchema, uuidSchema } from './common.js';

export { idParamsSchema };

const siteSectionSchema = z.object({
  id: z.string().trim().min(1, 'Section id is required.').max(100, 'Section id is too long.'),
  enabled: z.boolean(),
  order: z.number().int('order must be an integer.').optional()
}).strict();

const customFontSchema = z.object({
  id: z.string().trim().min(1, 'Font id is required.').max(100, 'Font id is too long.'),
  name: z.string().trim().min(1, 'Font name is required.').max(120, 'Font name is too long.'),
  family: z.string().trim().min(1, 'Font family is required.').max(120, 'Font family is too long.'),
  dataUrl: z.string().trim().min(1, 'Font dataUrl is required.'),
  format: z.string().trim().min(1, 'Font format is required.').max(20, 'Font format is too long.')
}).strict();

const emailTemplateSchema = z.object({
  subject: z.string().trim().max(255, 'Subject is too long.'),
  html: z.string().max(2000000, 'HTML content is too large.')
}).strict();

const paymentMethodConfigSchema = z.object({
  id: z.string().trim().min(1, 'Payment method id is required.').max(64, 'Payment method id is too long.'),
  label: z.string().trim().min(1, 'Payment method label is required.').max(120, 'Payment method label is too long.'),
  instructions: z.string().trim().min(1, 'Payment instructions are required.').max(4000, 'Payment instructions are too long.'),
  accountDetails: z.string().trim().min(1, 'Payment account details are required.').max(4000, 'Payment account details are too long.'),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional()
}).strict();

const siteFaqItemSchema = z.object({
  question: optionalTrimmedString(500),
  answer: optionalTrimmedString(10000)
}).strict();

const authProviderMetadataSchema = z.object({
  enabled: z.boolean(),
  lastUpdatedAt: z.string().datetime().optional()
}).strict();

export const updateUserRoleParamsSchema = idParamsSchema;
export const updateUserBalanceParamsSchema = idParamsSchema;
export const orderIdParamsSchema = idParamsSchema;

export const updateUserRoleBodySchema = z.object({
  role: roleSchema
}).strict();

export const updateUserBalanceBodySchema = z.object({
  balance: z.coerce.number().finite('Balance must be a valid number.')
}).strict();

export const updateOrderStatusBodySchema = z.object({
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
    'PAYMENT_RECEIVED'
  ])
}).strict();

export const rejectOrderPaymentBodySchema = z.object({
  reason: nonEmptyString('Rejection reason is required.', 500)
}).strict();

export const createOrderDeliveryBodySchema = z.object({
  orderItemId: uuidSchema.optional(),
  deliveryType: z.enum(['MIXED', 'KEY', 'ACCOUNT', 'LINK']).optional(),
  deliveryContent: nonEmptyString('Delivery content is required.', 1000000),
  activationGuide: optionalTrimmedString(100000),
  restrictions: optionalTrimmedString(100000),
  region: optionalTrimmedString(500)
}).strict();

export const sendClientNotificationBodySchema = z.object({
  title: nonEmptyString('Notification title is required.', 150),
  message: nonEmptyString('Notification message is required.', 5000),
  targetUserIds: z.array(uuidSchema).optional()
}).strict();

export const sendTestEmailBodySchema = z.object({
  to: z.string().trim().email('Must be a valid email address.').transform((value) => value.toLowerCase())
}).strict();

export const cleanSiteDataBodySchema = z.object({
  table: z.enum(['all', 'categories', 'subcategories', 'listings', 'orders', 'users']),
  confirmation: nonEmptyString('Confirmation is required.', 50)
}).strict();

export const couponIdParamsSchema = idParamsSchema;

export const couponBodySchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required.').max(64, 'Coupon code is too long.'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.coerce.number().positive('Coupon value must be greater than 0.'),
  minAmount: z.coerce.number().nonnegative().nullable().optional(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  active: z.boolean().optional()
}).strict();

export const importSiteDataBodySchema = z.object({
  fileBase64: z.string().trim().min(1, 'fileBase64 is required.')
}).strict();

export const updateSiteConfigBodySchema = z.object({
  logoUrl: optionalImageUrlSchema(),
  siteName: optionalTrimmedString(120),
  logoSize: z.coerce.number().int().min(16).max(256).optional(),
  faviconUrl: optionalImageUrlSchema(),
  startupLoaderEnabled: z.boolean().optional(),
  startupLoaderImageUrl: optionalImageUrlSchema(),
  startupLoaderBackground: optionalTrimmedString(50),
  primaryColor: optionalTrimmedString(50),
  heroSlides: z.array(z.unknown()).optional(),
  heroPromoBanners: z.array(z.unknown()).optional(),
  floatingBrandCards: z.array(z.unknown()).optional(),
  heroSlideHeight: z.coerce.number().int().min(0).max(2000).optional(),
  coverBackgroundUrl: optionalImageUrlSchema(),
  coverListingIds: z.array(uuidSchema).optional(),
  storeSections: z.array(siteSectionSchema).optional(),
  accentColor: optionalTrimmedString(50),
  accentHoverColor: optionalTrimmedString(50),
  accentSoftColor: optionalTrimmedString(50),
  accentTextColor: optionalTrimmedString(50),
  fontFamily: optionalTrimmedString(255),
  customFonts: z.array(customFontSchema).optional(),
  headerAnnouncement: optionalTrimmedString(255),
  headerSearchPlaceholder: optionalTrimmedString(255),
  headerCtaLabel: optionalTrimmedString(120),
  footerTagline: optionalTrimmedString(255),
  footerDescription: optionalTrimmedString(5000),
  footerEmail: optionalTrimmedString(255),
  footerPhone: optionalTrimmedString(64),
  footerWhatsapp: optionalTrimmedString(64),
  whatsappContactNumber: optionalTrimmedString(64),
  whatsappFloatingButtonEnabled: z.boolean().optional(),
  footerAddress: optionalTrimmedString(500),
  footerCopyright: optionalTrimmedString(255),
  cgvPageTitle: optionalTrimmedString(255),
  cgvPageContent: optionalTrimmedString(50000),
  refundPageTitle: optionalTrimmedString(255),
  refundPageContent: optionalTrimmedString(50000),
  howItWorksPageTitle: optionalTrimmedString(255),
  howItWorksPageContent: optionalTrimmedString(50000),
  faqPageTitle: optionalTrimmedString(255),
  faqPageIntro: optionalTrimmedString(10000),
  faqItems: z.array(siteFaqItemSchema).max(30).optional(),
  invoiceIssuerName: optionalTrimmedString(255),
  invoiceLegalMentions: optionalTrimmedString(5000),
  seoTitle: optionalTrimmedString(255),
  seoDescription: optionalTrimmedString(5000),
  seoKeywords: optionalTrimmedString(2000),
  seoCanonicalUrl: optionalTrimmedString(500),
  seoOgImageUrl: optionalImageUrlSchema(),
  seoRobots: optionalTrimmedString(100),
  seoSitemapEnabled: z.boolean().optional(),
  seoOrganizationName: optionalTrimmedString(255),
  seoGoogleAnalyticsId: optionalTrimmedString(120),
  seoGoogleAdsConversionId: optionalTrimmedString(120),
  seoFacebookPixelId: optionalTrimmedString(120),
  smtpMailerName: optionalTrimmedString(255),
  smtpHost: optionalTrimmedString(255),
  smtpDriver: optionalTrimmedString(50),
  smtpPort: optionalTrimmedString(10),
  smtpUsername: optionalTrimmedString(255),
  smtpEmailId: optionalTrimmedString(255),
  smtpEncryption: optionalTrimmedString(20),
  smtpPassword: optionalTrimmedString(255),
  paymentMethods: z.array(paymentMethodConfigSchema).optional(),
  emailTemplates: z.record(z.string(), emailTemplateSchema).optional(),
  adminNotificationsEnabled: z.boolean().optional(),
  adminNotificationSound: z.boolean().optional(),
  adminNotificationPollSeconds: z.coerce.number().int().min(5).max(3600).optional(),
  paymentReviewReminderHours: z.coerce.number().min(1).max(168).optional(),
  loyaltyPointsPerDinar: z.coerce.number().min(0).max(1000).optional(),
  loyaltyMaxDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  whatsappNotificationsEnabled: z.boolean().optional(),
  whatsappNotificationWebhookUrl: optionalTrimmedString(500),
  telegramNotificationsEnabled: z.boolean().optional(),
  telegramBotToken: optionalTrimmedString(255),
  telegramChatId: optionalTrimmedString(255),
  messengerNotificationsEnabled: z.boolean().optional(),
  messengerNotificationWebhookUrl: optionalTrimmedString(500),
  click2payEnabled: z.boolean().optional(),
  click2payMerchantId: optionalTrimmedString(255),
  click2payApiKey: optionalTrimmedString(255),
  authProviders: z.record(z.string(), authProviderMetadataSchema).optional()
}).strict();
