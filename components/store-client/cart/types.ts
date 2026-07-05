import { CouponValidationResult, Listing, LoyaltySummary, Order, SiteConfig, UploadAssetResponse, User } from '../../../types';

export interface GuestFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CheckoutSuccessState {
  order: Order;
}

export type PaymentProofState = {
  file: File;
  previewUrl?: string;
  upload?: UploadAssetResponse | null;
} | null;

export interface StoreCartPageProps {
  navigateTo: (page: string) => void;
  onCartUpdate: (count: number) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
  siteConfig: SiteConfig;
  listings: Listing[];
  user: User;
  orders: Order[];
  onOrderCreated: (order: Order) => void;
}

export interface LoyaltyCheckoutState {
  useLoyaltyPoints: boolean;
  loyalty?: LoyaltySummary | null;
  estimatedDiscount: number;
}

export interface CouponCheckoutState {
  couponCode: string;
  validation?: CouponValidationResult | null;
  isApplying: boolean;
}

export interface CheckoutIdentityFormProps {
  isGuest: boolean;
  user: Pick<User, 'phone'>;
  guestForm: GuestFormState;
  onGuestFieldChange: (field: keyof GuestFormState, value: string) => void;
}
