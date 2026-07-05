import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { Listing } from '../../../types';
import { getListingDiscountLabel, getPackageSavings, hasListingDiscount, hasPackageSavings } from '../../../utils/pricing';
import PriceDisplay from '../PriceDisplay';
import { ListingImage } from '../ListingImage';
import StarRating from '../reviews/StarRating';

interface HorizontalListingCardProps {
  listing: Listing;
  onViewProduct: (listing: Listing) => void;
}

const HorizontalListingCard: React.FC<HorizontalListingCardProps> = ({ listing, onViewProduct }) => {
  const hasDiscount = hasListingDiscount(listing);
  const discountLabel = getListingDiscountLabel(listing);

  return (
    <article className="group snap-start flex min-w-[280px] max-w-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-indigo-100 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ListingImage listing={listing} />
        </div>
        <div className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {listing.game}
        </div>
        {listing.isPackage && (
          <div className="absolute left-3 top-12 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-black text-white shadow-lg">
            Package
          </div>
        )}
        {listing.isInstant && (
          <div className="absolute right-3 top-3 flex items-center rounded-md bg-green-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
            <Zap size={10} className="mr-1 fill-current" /> Instant
          </div>
        )}
        {hasDiscount && (
          <div className="absolute bottom-3 left-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
            {discountLabel}
          </div>
        )}
        {listing.logoUrl && (
          <img
            src={listing.logoUrl}
            alt={`${listing.game || listing.title} logo`}
            className="absolute bottom-2 right-2 h-8 w-8 rounded bg-white p-1 shadow-sm"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {listing.isPackage && hasPackageSavings(listing) && (
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
            Gain client: {getPackageSavings(listing).toFixed(2)} TND
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          <StarRating rating={Math.round(listing.ratingAverage || 0)} size={12} />
          <span className="text-xs text-slate-400">
            {listing.ratingCount ? `${(listing.ratingAverage || 0).toFixed(1)} (${listing.ratingCount})` : 'Nouveau'}
          </span>
        </div>
        <h3
          className="mb-2 line-clamp-2 cursor-pointer text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600"
          onClick={() => onViewProduct(listing)}
        >
          {listing.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-50 pt-4">
          <PriceDisplay listing={listing} priceClassName="text-xl font-black text-slate-900" />
          <button onClick={() => onViewProduct(listing)} className="rounded-lg bg-slate-100 p-2 text-slate-900 transition-colors hover:bg-slate-900 hover:text-white">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default HorizontalListingCard;
