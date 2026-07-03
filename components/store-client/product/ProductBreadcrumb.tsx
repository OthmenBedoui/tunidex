import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Category, Listing } from '../../../types';

interface ProductBreadcrumbProps {
  product: Listing;
  category?: Category;
  navigateTo: (page: string, slug?: string) => void;
}

const ProductBreadcrumb: React.FC<ProductBreadcrumbProps> = ({ product, category, navigateTo }) => (
  <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
    <button onClick={() => navigateTo('home')} className="hover:text-[var(--text-strong)]">
      Home
    </button>
    <ChevronRight size={14} />
    {category && (
      <>
        <button onClick={() => navigateTo('category', category.slug)} className="hover:text-[var(--text-strong)]">
          {category.name}
        </button>
        <ChevronRight size={14} />
      </>
    )}
    <span className="line-clamp-1 max-w-[360px] text-[var(--text-body)]">{product.title}</span>
  </nav>
);

export default ProductBreadcrumb;
