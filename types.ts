export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN'
}

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ELITE = 'Elite'
}

export enum OrderStatus {
  DRAFT_CART = 'DRAFT_CART',
  IN_PROGRESS = 'IN_PROGRESS',
  PAID = 'PAID',
  DELIVERED = 'DELIVERED',
  REGISTERED = 'REGISTERED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_UNDER_REVIEW = 'PAYMENT_UNDER_REVIEW',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  IN_DELIVERY = 'IN_DELIVERY',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  PAID = 'PAID',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum DeliveryStatus {
  LOCKED = 'LOCKED',
  READY = 'READY',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  RESENT = 'RESENT'
}

export enum ProductType {
  STANDARD = 'STANDARD',
  LOGIN_CREDENTIALS = 'LOGIN_CREDENTIALS',
  KEY = 'KEY'
}

export enum DiscountType {
  NONE = 'NONE',
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT'
}

export interface LoginCredential {
  id: string;
  username: string;
  password?: string;
  isUsed: boolean;
  assignedToOrderId?: string;
  createdAt: string;
}

export interface PackageItem {
  id?: string;
  packageListingId?: string;
  includedListingId: string;
  quantity: number;
  includedListing?: Listing;
}

export interface ProductVariant {
  id?: string;
  listingId?: string;
  name: string;
  price: number;
  order?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string; // e.g., 'software-apps'
  icon: string; // Lucide icon name string
  imageUrl?: string; // Hero background
  gradient?: string; // CSS class for hero
  description?: string;
  order?: number;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  icon?: string; // Lucide icon name, image URL, or uploaded data URL
  description?: string;
  order?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  avatarUrl: string;
  subscriptionTier: SubscriptionTier;
  emailVerified?: boolean;
  // Profile Fields
  fullName?: string;
  address?: string;
  phone?: string;
  paymentMethod?: string;
  whatsappNumber?: string;
  whatsappBotId?: string;
  whatsappOptIn?: boolean;
  whatsappWelcomeStatus?: 'NOT_REQUESTED' | 'PENDING' | 'PENDING_CONFIGURATION' | 'SENT' | 'FAILED';
  whatsappWelcomeSentAt?: string;
  whatsappWelcomeError?: string;
  createdAt?: string;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  isArchived?: boolean;
  isPackage?: boolean;
  variantLabel?: string;
  discountPercent?: number;
  discountType?: DiscountType;
  discountValue?: number;
  
  // Relations
  categoryId: string;
  category?: Category;
  subCategoryId?: string;
  subCategory?: SubCategory;

  // Images
  logoUrl?: string; // The specific brand logo (e.g. Netflix logo)
  imageUrl?: string; // The main thumbnail. Packages can use included product images.
  cardTemplate?: string;
  gallery: string[]; // Array of image URLs

  // Meta
  game?: string; // Keep for legacy/search (e.g. "Valorant")
  platform?: string;
  region?: string;
  activationCountry?: string;
  source?: string;
  activationGuideTitle?: string;
  activationGuideContent?: string;
  restrictionsTitle?: string;
  restrictionsContent?: string;
  regionTitle?: string;
  regionContent?: string;
  systemRequirementsEnabled?: boolean;
  systemRequirementsPlatform?: string;
  minimumOs?: string;
  minimumMemory?: string;
  minimumStorage?: string;
  minimumProcessor?: string;
  minimumGraphics?: string;
  recommendedOs?: string;
  recommendedMemory?: string;
  recommendedStorage?: string;
  recommendedProcessor?: string;
  recommendedGraphics?: string;
  stock: number;
  deliveryTimeHours: number;
  isInstant: boolean;
  preparationTime?: string;
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string;
  salesCount?: number;
  ratingAverage?: number;
  ratingCount?: number;

  // Product Key Management
  productType: ProductType;
  credentials?: LoginCredential[]; // Pool of logins/passwords
  staticKey?: string; // A single key for all buyers
  packageItems?: PackageItem[];
  variants?: ProductVariant[];
}

export interface SiteConfig {
  logoUrl: string;
  siteName: string;
  logoSize?: number;
  faviconUrl?: string;
  startupLoaderEnabled?: boolean;
  startupLoaderImageUrl?: string;
  startupLoaderBackground?: string;
  primaryColor?: string;
  heroSlides?: HeroSlide[];
  heroPromoBanners?: HeroPromoBanner[];
  floatingBrandCards?: FloatingBrandCard[];
  heroSlideHeight?: number;
  coverBackgroundUrl?: string;
  coverListingIds?: string[];
  storeSections?: StoreSectionConfig[];
  accentColor?: string;
  accentHoverColor?: string;
  accentSoftColor?: string;
  accentTextColor?: string;
  fontFamily?: string;
  customFonts?: CustomFont[];
  headerAnnouncement?: string;
  headerSearchPlaceholder?: string;
  headerCtaLabel?: string;
  footerTagline?: string;
  footerDescription?: string;
  footerEmail?: string;
  footerPhone?: string;
  footerWhatsapp?: string;
  whatsappContactNumber?: string;
  whatsappFloatingButtonEnabled?: boolean;
  footerAddress?: string;
  footerCopyright?: string;
  cgvPageTitle?: string;
  cgvPageContent?: string;
  refundPageTitle?: string;
  refundPageContent?: string;
  howItWorksPageTitle?: string;
  howItWorksPageContent?: string;
  faqPageTitle?: string;
  faqPageIntro?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  invoiceIssuerName?: string;
  invoiceLegalMentions?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoCanonicalUrl?: string;
  seoOgImageUrl?: string;
  seoRobots?: string;
  seoSitemapEnabled?: boolean;
  seoOrganizationName?: string;
  seoGoogleAnalyticsId?: string;
  seoGoogleAdsConversionId?: string;
  seoFacebookPixelId?: string;
  // SMTP Configuration
  smtpMailerName?: string;
  smtpHost?: string;
  smtpDriver?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpEmailId?: string;
  smtpEncryption?: string;
  smtpPassword?: string;
  paymentMethods?: PaymentMethodConfig[];
  emailTemplates?: Record<string, { subject: string; html: string }>;
  adminNotificationsEnabled?: boolean;
  adminNotificationSound?: boolean;
  adminNotificationPollSeconds?: number;
  paymentReviewReminderHours?: number;
  loyaltyPointsPerDinar?: number;
  loyaltyMaxDiscountPercent?: number;
  whatsappNotificationsEnabled?: boolean;
  whatsappNotificationWebhookUrl?: string;
  telegramNotificationsEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  messengerNotificationsEnabled?: boolean;
  messengerNotificationWebhookUrl?: string;
  // Payment Gateway: Click2pay
  click2payEnabled?: boolean;
  click2payMerchantId?: string;
  click2payApiKey?: string;
  authProviders?: Record<string, { enabled: boolean; lastUpdatedAt?: string }>;
}

export interface PaymentMethodConfig {
  id: string;
  label: string;
  instructions: string;
  accountDetails: string;
  isActive: boolean;
  sortOrder?: number;
}

export type AuthProviderKey =
  | 'email-password'
  | 'google'
  | 'facebook'
  | 'apple'
  | 'discord'
  | 'github'
  | 'microsoft';

export type AuthProviderFieldKind = 'text' | 'password' | 'url' | 'textarea';

export interface AuthProviderField {
  key: string;
  envName: string;
  label: string;
  description?: string;
  value: string;
  displayValue: string;
  maskedValue?: string;
  required: boolean;
  secret: boolean;
  multiline?: boolean;
  kind: AuthProviderFieldKind;
  configured: boolean;
}

export interface AuthProviderConfig {
  key: AuthProviderKey;
  name: string;
  description: string;
  supported: boolean;
  enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  configured: boolean;
  environmentStatus: 'CONFIGURED' | 'MISSING_CREDENTIALS';
  lastUpdatedAt?: string;
  fields: AuthProviderField[];
}

export interface PublicAuthProvider {
  key: AuthProviderKey;
  name: string;
  description: string;
  authUrl: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

export interface UploadAssetResponse {
  url: string;
  absoluteUrl: string;
  relativePath: string;
  contentType: 'image/webp';
  width: number;
  height: number;
  size: number;
}

export type AdminOrderListSort = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';
export type AdminUserListSort = 'newest' | 'oldest' | 'email-asc' | 'email-desc' | 'balance-desc' | 'balance-asc';
export type ListingListSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'title-asc' | 'title-desc';
export type BlogPostListSort = 'newest' | 'oldest';

export interface AdminOrdersQueryParams {
  page?: number;
  cursor?: string;
  limit?: number;
  status?: OrderStatus | 'all';
  q?: string;
  sort?: AdminOrderListSort;
}

export interface AdminUsersQueryParams {
  page?: number;
  cursor?: string;
  limit?: number;
  role?: UserRole | 'all';
  q?: string;
  sort?: AdminUserListSort;
}

export interface ListingsQueryParams {
  page?: number;
  cursor?: string;
  limit?: number;
  q?: string;
  sort?: ListingListSort;
  scope?: 'public' | 'all' | 'archived';
}

export interface BlogPostsQueryParams {
  page?: number;
  cursor?: string;
  limit?: number;
  tag?: string;
  sort?: BlogPostListSort;
  status?: 'PUBLISHED' | 'DRAFT' | 'all';
  q?: string;
}

export interface ReviewsQueryParams {
  page?: number;
  cursor?: string;
  limit?: number;
}

export interface CustomFont {
  id: string;
  name: string;
  family: string;
  dataUrl: string;
  format: string;
}

export interface StoreSectionConfig {
  id: string;
  enabled: boolean;
  order?: number;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  linkType?: 'listing' | 'category' | 'url' | 'collections';
  linkTarget?: string;
}

export interface HeroPromoBanner {
  id: string;
  imageUrl: string;
  alt?: string;
  linkType?: 'listing' | 'category' | 'url' | 'collections';
  linkTarget?: string;
}

export interface FloatingBrandCard {
  id: string;
  name: string;
  imageUrl: string;
  linkType?: 'listing' | 'category' | 'url' | 'collections';
  linkTarget?: string;
}

export interface CartItem {
  id: string;
  listingId: string;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  listing: Listing;
}

export interface OrderItem {
  id: string;
  listingId: string;
  quantity: number;
  priceSnapshot: number;
  titleSnapshot: string;
  productSnapshotImage?: string;
  variantId?: string;
  variantSnapshot?: string;
  deliveryType?: string;
  status?: string;
  deliveredContent?: string; // The login/pass or key delivered to the customer
  review?: Review | null;
}

export interface Review {
  id: string;
  userId: string;
  listingId: string;
  orderId: string;
  rating: number;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  createdAt: string;
  user?: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  listing?: Pick<Listing, 'id' | 'title' | 'slug' | 'imageUrl'>;
  order?: Pick<Order, 'id' | 'orderNumber'>;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl?: string | null;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string | null;
  authorId: string;
  author?: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl'>;
  views: number;
  createdAt: string;
  updatedAt: string;
  relatedListings?: Array<Pick<Listing, 'id' | 'title' | 'slug' | 'imageUrl' | 'price' | 'discountType' | 'discountValue' | 'discountPercent' | 'logoUrl' | 'game' | 'isInstant' | 'stock' | 'deliveryTimeHours' | 'productType' | 'gallery' | 'categoryId'> & Partial<Listing>>;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface ReviewsResponse extends PaginatedResponse<Review> {
  summary: ReviewSummary;
}

export interface Payment {
  id: string;
  orderId: string;
  method: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  customerReference?: string | null;
  proofFileUrl?: string | null;
  reference?: string | null;
  proofUrl?: string | null;
  declaredAt?: string | null;
  submittedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

export interface LoyaltyPointEntry {
  id: string;
  userId: string;
  orderId?: string | null;
  points: number;
  type: string;
  description?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface LoyaltySummary {
  balance: number;
  redeemableAmount: number;
  pointsPerDinar: number;
  maxDiscountPercent: number;
  history: LoyaltyPointEntry[];
}

export interface Delivery {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  status: DeliveryStatus;
  deliveryType: string;
  activationGuide?: string | null;
  restrictions?: string | null;
  region?: string | null;
  sentAt?: string | null;
  sentBy?: string | null;
  viewedAt?: string | null;
  resendCount?: number;
}

export interface OrderActionLog {
  id: string;
  orderId: string;
  actorType: 'GUEST' | 'USER' | 'ADMIN' | 'AGENT' | 'SYSTEM';
  actorId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderStatusHistoryEntry {
  key: string;
  label: string;
  status: string;
  state: 'done' | 'current' | 'upcoming';
  happenedAt?: string | null;
  description?: string;
}

export interface ClientNotification {
  id: string;
  userId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  orderStatus?: string | null;
  type: 'ORDER_STATUS' | 'CUSTOM' | 'SYSTEM' | string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  targetTab?: string | null;
  audience?: 'CLIENT' | 'ADMIN' | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  listingId?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  titleSnapshot: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  issueDate: string;
  totalAmount: number;
  items?: InvoiceItem[];
}

export interface GuestCheckoutPayload {
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  paymentMethod?: string;
  useLoyaltyPoints?: boolean;
  couponCode?: string;
  customerReference?: string;
  paymentProof?: {
    fileName: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  } | null;
  idempotencyKey?: string;
  items: Array<{
    listingId: string;
    variantId?: string;
    quantity: number;
  }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string; // Mapped from userId in backend
  buyer?: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl'>;
  buyerDisplayName?: string;
  items: OrderItem[];
  status: OrderStatus;
  amount: number;
  subtotal?: number;
  discount?: number;
  couponCode?: string | null;
  total?: number;
  currency?: string;
  customerType?: 'USER' | 'GUEST';
  guestEmail?: string | null;
  guestPhone?: string | null;
  trackingToken?: string | null;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  emailStatus?: string;
  emailError?: string | null;
  invoice?: Invoice | null;
  payments?: Payment[];
  deliveries?: Delivery[];
  actionLogs?: OrderActionLog[];
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  validFrom?: string | null;
  validTo?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  totalDiscountAmount?: number;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  type?: 'PERCENT' | 'FIXED';
  value?: number;
  subtotal: number;
  discountAmount: number;
  finalSubtotal: number;
  message?: string;
}
