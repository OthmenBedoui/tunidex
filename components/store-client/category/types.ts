import type { ReactNode } from 'react';
import { Listing, SubCategory } from '../../../types';

export interface StoreCategoryPageProps {
  categoryId: string;
  type: string;
  title: string;
  subtitle: string;
  heroGradient: string;
  heroImage: string;
  icon: ReactNode;
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string, slug?: string) => void;
  subCategories?: SubCategory[];
}

export interface CategoryBrandGroup {
  key: string;
  brand: string;
  cover: Listing;
  minPrice: number;
  offerCount: number;
  listings: Listing[];
}
