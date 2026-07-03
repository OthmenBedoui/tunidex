import { Listing, Order, SiteConfig, User } from '../../../types';

export interface GuestFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CheckoutSuccessState {
  orderNumber: string;
  invoiceNumber?: string;
  emailStatus?: string;
  status?: string;
  trackingToken?: string | null;
}

export type PaymentProofState = {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
} | null;

export interface StoreCartPageProps {
  navigateTo: (page: string) => void;
  onCartUpdate: (count: number) => void;
  siteConfig: SiteConfig;
  listings: Listing[];
  user: User;
  orders: Order[];
  onOrderCreated: (order: Order) => void;
}

export interface CheckoutIdentityFormProps {
  isGuest: boolean;
  user: Pick<User, 'phone'>;
  guestForm: GuestFormState;
  onGuestFieldChange: (field: keyof GuestFormState, value: string) => void;
}
