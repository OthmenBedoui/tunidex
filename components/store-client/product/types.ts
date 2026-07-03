import { Category, Listing } from '../../../types';

export interface StoreProductPageProps {
  product: Listing;
  categories: Category[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  navigateTo: (page: string, slug?: string) => void;
}

export interface ProductInfoAction {
  label: string;
  title: string;
  content: string;
}
