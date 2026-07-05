import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import CartItemsList from '../../components/store-client/cart/CartItemsList';
import CartSummaryCard from '../../components/store-client/cart/CartSummaryCard';
import CheckoutPaymentForm from '../../components/store-client/cart/CheckoutPaymentForm';
import CheckoutSuccessPanel from '../../components/store-client/cart/CheckoutSuccessPanel';
import { CheckoutSuccessState, GuestFormState, StoreCartPageProps } from '../../components/store-client/cart/types';
import { api } from '../../services/api';
import { useMyLoyalty } from '../../src/hooks/useMyLoyalty';
import { useCart } from '../../src/hooks/useCart';
import { queryKeys } from '../../src/queryKeys';
import { CouponValidationResult, Order, OrderStatus } from '../../types';
import { handleApiError } from '../../utils/apiError';
import { clearGuestCart, getGuestCartCount, getGuestCartItems, removeGuestCartLine } from '../../utils/guestCart';
import { getListingFinalPrice } from '../../utils/pricing';

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAYMENT_UNDER_REVIEW,
  OrderStatus.PAYMENT_APPROVED,
  OrderStatus.PAID,
  OrderStatus.IN_DELIVERY,
  OrderStatus.IN_PROGRESS,
  OrderStatus.PAYMENT_RECEIVED
];

const CartPage: React.FC<StoreCartPageProps> = ({ navigateTo, onCartUpdate, onNotify, siteConfig, listings, user, orders, onOrderCreated }) => {
  const [items, setItems] = useState<ReturnType<typeof getGuestCartItems>>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(siteConfig.paymentMethods?.find((method) => method.isActive)?.id || 'bank_transfer');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<CouponValidationResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [formError, setFormError] = useState('');
  const isGuest = user.id === 'guest';
  const loyaltyQuery = useMyLoyalty(!isGuest && user.role === 'USER');
  const [guestForm, setGuestForm] = useState<GuestFormState>({
    firstName: user.fullName?.split(' ')[0] || '',
    lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
    email: user.email && user.id !== 'guest' ? user.email : '',
    phone: user.phone || ''
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState<CheckoutSuccessState | null>(null);
  const queryClient = useQueryClient();
  const cartQuery = useCart(!isGuest);
  const latestActiveOrder = !isGuest
    ? [...orders]
        .filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  const loadGuestCart = () => {
    const guestItems = getGuestCartItems(listings);
    setItems(guestItems);
    onCartUpdate(getGuestCartCount());
  };

  useEffect(() => {
    const defaultMethod = siteConfig.paymentMethods?.find((method) => method.isActive)?.id;
    if (defaultMethod) setPaymentMethod(defaultMethod);
  }, [siteConfig.paymentMethods]);

  useEffect(() => {
    if (isGuest) {
      loadGuestCart();
      return;
    }

    if (cartQuery.data) {
      setItems(cartQuery.data);
      onCartUpdate(cartQuery.data.reduce((acc, item) => acc + item.quantity, 0));
    }
  }, [cartQuery.data, isGuest, listings, onCartUpdate]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + ((item.variant?.price ?? getListingFinalPrice(item.listing)) * item.quantity), 0),
    [items]
  );
  const estimatedLoyaltyDiscount = useMemo(() => {
    const loyalty = loyaltyQuery.data;
    const couponAdjustedTotal = Math.max(0, total - (couponValidation?.discountAmount || 0));
    if (!useLoyaltyPoints || !loyalty || couponAdjustedTotal <= 0) return 0;
    const maxDiscount = (couponAdjustedTotal * (loyalty.maxDiscountPercent || 0)) / 100;
    return Math.round(Math.min(maxDiscount, loyalty.redeemableAmount) * 100) / 100;
  }, [couponValidation?.discountAmount, loyaltyQuery.data, total, useLoyaltyPoints]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponValidation(null);
      setFormError('');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const result = await api.validateCheckoutCoupon(couponCode.trim(), total);
      setCouponValidation(result);
      setFormError('');
      onNotify(result.message || 'Code promo applique.', 'success');
    } catch (error) {
      setCouponValidation(null);
      const message = handleApiError({
        error,
        fallbackMessage: 'Code promo invalide.',
        notify: onNotify,
        logContext: 'Unable to validate coupon'
      });
      setFormError(message);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemove = async (item: (typeof items)[number]) => {
    if (isGuest) {
      const nextItems = removeGuestCartLine(item.listingId, item.variantId);
      setItems(getGuestCartItems(listings));
      onCartUpdate(nextItems.reduce((acc, entry) => acc + entry.quantity, 0));
      return;
    }

    const newItems = items.filter((currentItem) => currentItem.id !== item.id);
    setItems(newItems);
    onCartUpdate(newItems.reduce((acc, currentItem) => acc + currentItem.quantity, 0));

    try {
      await api.removeFromCart(item.id);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible de retirer cet article du panier.',
        notify: onNotify,
        rollback: () => {
          setItems(items);
          onCartUpdate(items.reduce((acc, currentItem) => acc + currentItem.quantity, 0));
        },
        logContext: 'Unable to remove cart item'
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    }
  };

  const handleGuestFieldChange = (field: keyof GuestFormState, value: string) => {
    setGuestForm((current) => ({ ...current, [field]: value }));
    if (formError) setFormError('');
  };

  const handleCouponCodeChange = (value: string) => {
    setCouponCode(value.toUpperCase());
    setCouponValidation((current) => (current?.code === value.toUpperCase().trim() ? current : null));
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      setFormError('Votre panier est vide.');
      return;
    }

    setIsCheckingOut(true);
    setFormError('');

    try {
      const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const order: Order = await api.confirmCheckout(
        isGuest
          ? {
              ...guestForm,
              paymentMethod,
              useLoyaltyPoints,
              couponCode: couponCode.trim() || undefined,
              items: items.map((item) => ({
                listingId: item.listingId,
                variantId: item.variantId,
                quantity: item.quantity
              }))
            }
          : {
              paymentMethod,
              useLoyaltyPoints,
              couponCode: couponCode.trim() || undefined,
              phone: guestForm.phone || user.phone || ''
            },
        idempotencyKey
      );

      if (isGuest) {
        clearGuestCart();
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      }

      setItems([]);
      setUseLoyaltyPoints(false);
      setCouponCode('');
      setCouponValidation(null);
      onCartUpdate(0);
      onOrderCreated(order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.my });
      setCheckoutSuccess({
        order
      });
      setShowPaymentForm(false);
    } catch (error) {
      const message = handleApiError({
        error,
        fallbackMessage: 'Impossible d enregistrer votre commande.',
        notify: onNotify,
        logContext: 'Unable to confirm checkout'
      });
      setFormError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (checkoutSuccess) {
    return (
      <CheckoutSuccessPanel
        checkoutSuccess={checkoutSuccess}
        isGuest={isGuest}
        navigateTo={navigateTo}
        siteConfig={siteConfig}
        onNotify={onNotify}
        onOrderUpdated={(updatedOrder) => {
          setCheckoutSuccess({ order: updatedOrder });
          onOrderCreated(updatedOrder);
        }}
      />
    );
  }

  if (items.length === 0 && latestActiveOrder) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
          <div className="bg-slate-950 px-8 py-8 text-white">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Commande en cours</div>
            <h1 className="mt-2 text-3xl font-black">Votre commande est suivie ici</h1>
            <p className="mt-3 text-sm text-slate-300">Le panier est vide parce que votre commande a bien ete creee.</p>
          </div>
          <div className="p-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Commande</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{latestActiveOrder.orderNumber}</div>
              <div className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-700">
                {latestActiveOrder.status === OrderStatus.PAYMENT_UNDER_REVIEW ? 'Paiement en cours de traitement' : latestActiveOrder.status}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {latestActiveOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <span className="font-bold text-slate-900">{item.titleSnapshot}</span>
                  <span className="text-slate-500">x{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => navigateTo('user-dashboard')} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                Voir historique des commandes
              </button>
              <button onClick={() => navigateTo('home')} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Continuer mes achats
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <div className="mx-auto mb-8 flex h-32 w-32 animate-in zoom-in items-center justify-center rounded-full bg-slate-100 duration-300">
          <ShoppingBag size={64} className="text-slate-300" />
        </div>
        <h2 className="mb-4 text-3xl font-black text-slate-900">Votre panier est vide</h2>
        <button onClick={() => navigateTo('home')} className="rounded-xl bg-indigo-600 px-10 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 hover:bg-indigo-700">
          Parcourir la Boutique
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <CheckoutPaymentForm
        open={showPaymentForm}
        siteConfig={siteConfig}
        isGuest={isGuest}
        user={user}
        total={total}
        paymentMethod={paymentMethod}
        guestForm={guestForm}
        loyaltyState={{ useLoyaltyPoints, loyalty: loyaltyQuery.data || null, estimatedDiscount: estimatedLoyaltyDiscount }}
        couponState={{ couponCode, validation: couponValidation, isApplying: isApplyingCoupon }}
        isCheckingOut={isCheckingOut}
        formError={formError}
        onClose={() => setShowPaymentForm(false)}
        onSelectPaymentMethod={setPaymentMethod}
        onToggleLoyaltyPoints={setUseLoyaltyPoints}
        onCouponCodeChange={handleCouponCodeChange}
        onApplyCoupon={handleApplyCoupon}
        onGuestFieldChange={handleGuestFieldChange}
        onCheckout={handleCheckout}
      />

      <h1 className="mb-8 flex items-center text-3xl font-black text-slate-900">
        <ShoppingBag className="mr-3" />
        Mon Panier
        <span className="ml-3 rounded-full bg-slate-100 px-3 py-1 text-lg font-medium text-slate-400">{items.length} articles</span>
      </h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CartItemsList items={items} onRemove={handleRemove} />
        </div>

        <div className="lg:col-span-1">
          <CartSummaryCard
            total={total}
            isGuest={isGuest}
            user={user}
            guestForm={guestForm}
            loyaltyState={{ useLoyaltyPoints, loyalty: loyaltyQuery.data || null, estimatedDiscount: estimatedLoyaltyDiscount }}
            couponState={{ couponCode, validation: couponValidation, isApplying: isApplyingCoupon }}
            isCheckingOut={isCheckingOut}
            formError={formError}
            onOpenPayment={() => setShowPaymentForm(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
