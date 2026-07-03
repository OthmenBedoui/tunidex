import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Listing } from '../../../types';
import HorizontalListingCard from './HorizontalListingCard';

interface ProductRailSectionProps {
  railId: string;
  title: string;
  subtitle: string;
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  accent?: React.ReactNode;
}

const ProductRailSection: React.FC<ProductRailSectionProps> = ({ railId, title, subtitle, listings, onViewProduct, accent }) => {
  const scrollRail = (direction: 'left' | 'right') => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    rail.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (listings.length === 0) return null;

  return (
    <section>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-3xl font-black text-slate-900">{title}</h2>
            {accent}
          </div>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => scrollRail('left')} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scrollRail('right')} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div id={railId} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
        {listings.map((listing) => (
          <HorizontalListingCard key={listing.id} listing={listing} onViewProduct={onViewProduct} />
        ))}
      </div>
    </section>
  );
};

export default ProductRailSection;
