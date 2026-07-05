import { Category, Listing, SiteConfig } from '../../../types';

export interface StoreProductPageProps {
  product: Listing;
  categories: Category[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  navigateTo: (page: string, slug?: string) => void;
  siteConfig: SiteConfig;
}

export interface ProductInfoAction {
  label: string;
  title: string;
  content: string;
}
