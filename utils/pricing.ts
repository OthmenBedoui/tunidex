import { DiscountType, Listing } from '../types';

export const getListingDiscountType = (listing: Pick<Listing, 'discountType' | 'discountPercent' | 'discountValue'>): DiscountType => {
  if (listing.discountType === DiscountType.AMOUNT || listing.discountType === DiscountType.PERCENT) {
    return listing.discountType;
  }
  if ((listing.discountPercent || 0) > 0) {
    return DiscountType.PERCENT;
  }
  return DiscountType.NONE;
};

export const getListingDiscountValue = (listing: Pick<Listing, 'discountType' | 'discountPercent' | 'discountValue'>) => {
  const type = getListingDiscountType(listing);
  if (type === DiscountType.PERCENT) {
    return Number(listing.discountValue ?? listing.discountPercent ?? 0) || 0;
  }
  if (type === DiscountType.AMOUNT) {
    return Number(listing.discountValue ?? 0) || 0;
  }
  return 0;
};

export const getListingFinalPrice = (listing: Pick<Listing, 'price' | 'discountType' | 'discountPercent' | 'discountValue'>) => {
  const type = getListingDiscountType(listing);
  const value = getListingDiscountValue(listing);

  if (type === DiscountType.PERCENT) {
    return Math.max(0, listing.price * (1 - value / 100));
  }

  if (type === DiscountType.AMOUNT) {
    return Math.max(0, listing.price - value);
  }

  return listing.price;
};

export const hasListingDiscount = (listing: Pick<Listing, 'discountType' | 'discountPercent' | 'discountValue'>) => {
  return getListingDiscountType(listing) !== DiscountType.NONE && getListingDiscountValue(listing) > 0;
};

export const getListingDiscountLabel = (listing: Pick<Listing, 'discountType' | 'discountPercent' | 'discountValue'>) => {
  const type = getListingDiscountType(listing);
  const value = getListingDiscountValue(listing);

  if (type === DiscountType.PERCENT && value > 0) {
    return `-${Math.round(value)}%`;
  }

  if (type === DiscountType.AMOUNT && value > 0) {
    return `-${value.toFixed(2)} TND`;
  }

  return '';
};
