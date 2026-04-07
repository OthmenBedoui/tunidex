import type { CartItem, Listing } from '../types';

const GUEST_CART_KEY = 'tunidex_guest_cart';

type StoredGuestCartItem = {
  listingId: string;
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
      .map((item) => ({ listingId: item.listingId, quantity: item.quantity }));
  } catch {
    return [];
  }
};

const writeStoredCart = (items: StoredGuestCartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const getGuestCartCount = () => readStoredCart().reduce((total, item) => total + item.quantity, 0);

export const addGuestCartItem = (listingId: string) => {
  const items = readStoredCart();
  const existing = items.find((item) => item.listingId === listingId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ listingId, quantity: 1 });
  }
  writeStoredCart(items);
};

export const removeGuestCartItem = (listingId: string) => {
  const nextItems = readStoredCart().filter((item) => item.listingId !== listingId);
  writeStoredCart(nextItems);
  return nextItems;
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const getGuestCartItems = (listings: Listing[]): CartItem[] => {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  return readStoredCart()
    .map((item, index) => {
      const listing = listingMap.get(item.listingId);
      if (!listing || listing.isArchived) return null;
      return {
        id: `guest-${item.listingId}-${index}`,
        listingId: item.listingId,
        quantity: item.quantity,
        listing
      };
    })
    .filter((item): item is CartItem => Boolean(item));
};
