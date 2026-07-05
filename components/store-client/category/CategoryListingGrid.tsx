import React from 'react';
import { Zap } from 'lucide-react';
import { Listing } from '../../../types';
import { getListingDiscountLabel, hasListingDiscount } from '../../../utils/pricing';
import { ListingImage } from '../ListingImage';
import PriceDisplay from '../PriceDisplay';
import StarRating from '../reviews/StarRating';

interface CategoryListingGridProps {
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  getListingBrand: (listing: Listing) => string;
  getListingMeta: (listing: Listing) => string;
  emptyMessage?: string;
}

const CategoryListingGrid: React.FC<CategoryListingGridProps> = ({
  listings,
  onViewProduct,
  getListingBrand,
  getListingMeta,
  emptyMessage = 'Aucun produit trouve dans cette categorie.'
}) => {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {listings.map((listing) => (
        <div key={listing.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="relative h-48 overflow-hidden bg-slate-100">
            <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
              <ListingImage listing={listing} />
            </div>
            <div className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
              {getListingBrand(listing)}
            </div>
            {listing.isInstant && (
              <div className="absolute right-3 top-3 flex items-center rounded-md bg-green-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
                <Zap size={10} className="mr-1 fill-current" /> Instant
              </div>
            )}
            {hasListingDiscount(listing) && (
              <div className="absolute bottom-3 left-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
                {getListingDiscountLabel(listing)}
              </div>
            )}
            {listing.logoUrl && <img src={listing.logoUrl} className="absolute bottom-2 right-2 h-8 w-8 rounded bg-white p-1 shadow" />}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-2 cursor-pointer text-base font-bold text-slate-900 line-clamp-2 hover:text-indigo-600" onClick={() => onViewProduct(listing)}>
              {listing.title}
            </h3>
            <div className="mb-3 flex items-center gap-2">
              <StarRating rating={Math.round(listing.ratingAverage || 0)} size={12} />
              <span className="text-xs text-slate-400">
                {listing.ratingCount ? `${(listing.ratingAverage || 0).toFixed(1)} (${listing.ratingCount})` : 'Nouveau'}
              </span>
            </div>
            <div className="mb-4 text-xs text-slate-500">{getListingMeta(listing)}</div>
            <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
              <PriceDisplay listing={listing} priceClassName="text-xl font-black text-slate-900" />
              <button onClick={() => onViewProduct(listing)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white">
                Voir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryListingGrid;
