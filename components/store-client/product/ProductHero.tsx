import React from 'react';
import { Eye, Heart, Star } from 'lucide-react';
import { Category, Listing } from '../../../types';
import { ListingImage } from '../ListingImage';

interface ProductHeroProps {
  product: Listing;
  category?: Category;
}

const ProductHero: React.FC<ProductHeroProps> = ({ product, category }) => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-[188px_minmax(0,1fr)]">
    <div className="relative h-[280px] w-full overflow-hidden rounded-[10px] bg-[var(--surface-card)] shadow-sm md:w-[188px]">
      <ListingImage listing={product} />
      <button type="button" className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-900 shadow-lg">
        <Eye size={15} /> View
      </button>
    </div>

    <main className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-black leading-tight text-[var(--text-strong)] md:text-[24px]">{product.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-black uppercase text-white">{category?.name || 'Game'}</span>
            <span className="rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-black uppercase text-[var(--text-strong)]">Digital Key</span>
            <span className="hidden h-6 w-px bg-[var(--border-soft)] sm:block" />
            <span className="flex items-center gap-1 text-amber-400">
              {[...Array(4)].map((_, index) => (
                <Star key={index} size={17} fill="currentColor" />
              ))}
              <Star size={17} className="text-[var(--text-muted)]" fill="currentColor" />
            </span>
          </div>
        </div>
        <button type="button" className="mt-1 text-[var(--text-muted)] transition hover:text-rose-500">
          <Heart size={22} fill="currentColor" />
        </button>
      </div>
    </main>
  </div>
);

export default ProductHero;
