import type { CartItem, Listing } from '../types';

const GUEST_CART_KEY = 'tunibots_guest_cart';

type StoredGuestCartItem = {
  listingId: string;
  variantId?: string;
  quantity: number;
};

const readStoredCart = (): StoredGuestCartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGuestCartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.listingId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0)
      .map((item) => ({
        listingId: item.listingId,
        variantId: typeof item.variantId === 'string' ? item.variantId : undefined,
        quantity: item.quantity
      }));
  } catch (error) {
    console.warn('Unable to read guest cart from localStorage.', error);
    return [];
  }
};

const writeStoredCart = (items: StoredGuestCartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const getGuestCartCount = () => readStoredCart().reduce((total, item) => total + item.quantity, 0);

export const addGuestCartItem = (listingId: string, variantId?: string) => {
  const items = readStoredCart();
  const existing = items.find((item) => item.listingId === listingId && (item.variantId || '') === (variantId || ''));
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ listingId, variantId, quantity: 1 });
  }
  writeStoredCart(items);
};

export const removeGuestCartItem = (listingId: string) => {
  const nextItems = readStoredCart().filter((item) => item.listingId !== listingId);
  writeStoredCart(nextItems);
  return nextItems;
};

export const removeGuestCartLine = (listingId: string, variantId?: string) => {
  const nextItems = readStoredCart().filter((item) => !(item.listingId === listingId && (item.variantId || '') === (variantId || '')));
  writeStoredCart(nextItems);
  return nextItems;
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const getGuestCartItems = (listings: Listing[]): CartItem[] => {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  return readStoredCart()
    .map<CartItem | null>((item, index) => {
      const listing = listingMap.get(item.listingId);
      if (!listing || listing.isArchived) return null;
      const variant = item.variantId ? listing.variants?.find((entry) => entry.id === item.variantId) : undefined;
      return {
        id: `guest-${item.listingId}-${item.variantId || 'base'}-${index}`,
        listingId: item.listingId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        ...(variant ? { variant } : {}),
        quantity: item.quantity,
        listing
      };
    })
    .filter((item): item is CartItem => Boolean(item));
};
