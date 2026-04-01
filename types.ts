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
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID_PROCESSING = 'PAID_PROCESSING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ProductType {
  STANDARD = 'STANDARD',
  LOGIN_CREDENTIALS = 'LOGIN_CREDENTIALS',
  KEY = 'KEY'
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

export interface Order {
  id: string;
  buyerId: string; // Mapped from userId in backend
  items: OrderItem[];
  status: OrderStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
}