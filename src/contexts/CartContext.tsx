/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { getGuestCartCount } from '../../utils/guestCart';
import { useAuth } from './AuthContext';
import { useCart as useCartQuery } from '../hooks/useCart';

type CartContextValue = {
  cartCount: number;
  setCartCount: React.Dispatch<React.SetStateAction<number>>;
  updateCartCount: (count: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const isAuthenticated = user.id !== 'guest';
  const cartQuery = useCartQuery(isAuthenticated);

  const resolvedCartCount = useMemo(() => {
    if (!isAuthenticated) {
      return cartCount || getGuestCartCount();
    }
    return cartQuery.data?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  }, [cartCount, cartQuery.data, isAuthenticated]);

  const value = useMemo(() => ({
    cartCount: resolvedCartCount,
    setCartCount,
    updateCartCount: setCartCount
  }), [resolvedCartCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartState = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartState must be used within CartProvider');
  }
  return context;
};
