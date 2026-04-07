import React from 'react';
import { Tag } from 'lucide-react';
import { Listing } from '../types';
import { getListingDiscountLabel, getListingFinalPrice, hasListingDiscount } from '../utils/pricing';

interface PriceDisplayProps {
  listing: Listing;
  priceClassName?: string;
  oldPriceClassName?: string;
  badgeClassName?: string;
  suffixClassName?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  listing,
  priceClassName = 'text-2xl font-extrabold text-slate-900',
  oldPriceClassName = 'text-sm text-slate-400 line-through',
  badgeClassName = 'inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600',
  suffixClassName = 'text-xs font-normal text-slate-500'
}) => {
  const discounted = hasListingDiscount(listing);

  return (
    <div>
      {discounted && (
        <div className="mb-1 flex items-center gap-2 flex-wrap">
          <span className={oldPriceClassName}>{listing.price.toFixed(2)} TND</span>
          <span className={badgeClassName}>
            <Tag size={12} />
            {getListingDiscountLabel(listing)}
          </span>
        </div>
      )}
      <div className={priceClassName}>
        {getListingFinalPrice(listing).toFixed(2)} <span className={suffixClassName}>TND</span>
      </div>
    </div>
  );
};

export default PriceDisplay;
