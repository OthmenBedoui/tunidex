import { Category, Listing, SiteConfig } from '../../../types';

export interface StoreHomePageProps {
  listings: Listing[];
  categories: Category[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string, slug?: string) => void;
  siteConfig: SiteConfig;
}
