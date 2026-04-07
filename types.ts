export enum UserRole {
  GUEST = 'GUEST',
  CLIENT = 'CLIENT',
  SELLER = 'SELLER',
  SUB_ADMIN = 'SUB_ADMIN',
  ADMIN = 'ADMIN'
}

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ELITE = 'Elite'
}

export enum OrderStatus {
  REGISTERED = 'REGISTERED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
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

export interface Category {
  id: string;
  name: string;
  slug: string; // e.g., 'software-apps'
  icon: string; // Lucide icon name string
  imageUrl?: string; // Hero background
  gradient?: string; // CSS class for hero
  description?: string;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  icon?: string;
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
  createdAt?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  isArchived?: boolean;
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
  imageUrl: string; // The main thumbnail
  gallery: string[]; // Array of image URLs

  // Meta
  game?: string; // Keep for legacy/search (e.g. "Valorant")
  stock: number;
  deliveryTimeHours: number;
  isInstant: boolean;
  preparationTime?: string;
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string;
  salesCount?: number;

  // Product Key Management
  productType: ProductType;
  credentials?: LoginCredential[]; // Pool of logins/passwords
  staticKey?: string; // A single key for all buyers
}

export interface SiteConfig {
  logoUrl: string;
  siteName: string;
  faviconUrl?: string;
  primaryColor?: string;
  heroSlides?: HeroSlide[];
  heroSlideHeight?: number;
  accentColor?: string;
  accentHoverColor?: string;
  accentSoftColor?: string;
  accentTextColor?: string;
  // SMTP Configuration
  smtpMailerName?: string;
  smtpHost?: string;
  smtpDriver?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpEmailId?: string;
  smtpEncryption?: string;
  smtpPassword?: string;
  // Payment Gateway: Click2pay
  click2payEnabled?: boolean;
  click2payMerchantId?: string;
  click2payApiKey?: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  linkType?: 'listing' | 'category' | 'url' | 'collections';
  linkTarget?: string;
}

export interface CartItem {
  id: string;
  listingId: string;
  quantity: number;
  listing: Listing;
}

export interface OrderItem {
  id: string;
  listingId: string;
  quantity: number;
  priceSnapshot: number;
  titleSnapshot: string;
  deliveredContent?: string; // The login/pass or key delivered to the customer
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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentMethod?: string;
  items: Array<{
    listingId: string;
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
  currency?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  emailStatus?: string;
  emailError?: string | null;
  invoice?: Invoice | null;
  createdAt: string;
  updatedAt: string;
}
