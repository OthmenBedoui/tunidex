import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import CartItemsList from '../../components/store-client/cart/CartItemsList';
import CartSummaryCard from '../../components/store-client/cart/CartSummaryCard';
import CheckoutPaymentForm from '../../components/store-client/cart/CheckoutPaymentForm';
import CheckoutSuccessPanel from '../../components/store-client/cart/CheckoutSuccessPanel';
import { CheckoutSuccessState, GuestFormState, PaymentProofState, StoreCartPageProps } from '../../components/store-client/cart/types';
import { api } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { clearGuestCart, getGuestCartCount, getGuestCartItems, removeGuestCartLine } from '../../utils/guestCart';
import { getListingFinalPrice } from '../../utils/pricing';

const PAYMENT_INSTRUCTIONS: Record<string, string> = {
  whatsapp: 'Envoyez votre paiement ou capture au support WhatsApp avec le numero de commande. Un agent validera manuellement.',
  edinar: 'Payez via EDINAR, puis ajoutez la reference de transaction et une capture si disponible.',
  flouci: 'Payez via Flouci, puis ajoutez la reference Flouci et une capture si disponible.',
  bank_transfer: 'Effectuez le virement puis ajoutez la reference bancaire et le recu.',
  cash: 'Choisissez cette option si un agent doit confirmer un paiement cash.'
};

const fileToProofPayload = (file: File) =>
  new Promise<PaymentProofState>((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('La preuve de paiement ne doit pas depasser 5 Mo.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: String(reader.result || '')
      });
    reader.onerror = () => reject(new Error('Impossible de lire le fichier de preuve.'));
    reader.readAsDataURL(file);
  });

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAYMENT_UNDER_REVIEW,
  OrderStatus.PAYMENT_APPROVED,
  OrderStatus.IN_DELIVERY,
  OrderStatus.IN_PROGRESS,
  OrderStatus.PAYMENT_RECEIVED
];

const CartPage: React.FC<StoreCartPageProps> = ({ navigateTo, onCartUpdate, siteConfig, listings, user, orders, onOrderCreated }) => {
  const [items, setItems] = useState<ReturnType<typeof getGuestCartItems>>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('whatsapp');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<PaymentProofState>(null);
  const [formError, setFormError] = useState('');
  const [guestForm, setGuestForm] = useState<GuestFormState>({
    firstName: user.fullName?.split(' ')[0] || '',
    lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
    email: user.email && user.id !== 'guest' ? user.email : '',
    phone: user.phone || ''
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState<CheckoutSuccessState | null>(null);

  const isGuest = user.id === 'guest';
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
    if (siteConfig.click2payEnabled) {
      setPaymentMethod('click2pay');
    }
  }, [siteConfig.click2payEnabled]);

  useEffect(() => {
    if (isGuest) {
      loadGuestCart();
      return;
    }

    api
      .getCart()
      .then((data) => {
        setItems(data);
        onCartUpdate(data.reduce((acc, item) => acc + item.quantity, 0));
      })
      .catch(console.error);
  }, [isGuest, listings]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + ((item.variant?.price ?? getListingFinalPrice(item.listing)) * item.quantity), 0),
    [items]
  );

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
    } catch {
      // UI-first behavior retained.
    }
  };

  const handleGuestFieldChange = (field: keyof GuestFormState, value: string) => {
    setGuestForm((current) => ({ ...current, [field]: value }));
    if (formError) setFormError('');
  };

  const handlePaymentProofChange = async (file: File | null) => {
    if (!file) {
      setPaymentProof(null);
      return;
    }

    try {
      setPaymentProof(await fileToProofPayload(file));
      setFormError('');
    } catch (error) {
      setPaymentProof(null);
      setFormError(error instanceof Error ? error.message : 'Fichier invalide.');
    }
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
              customerReference: paymentReference,
              paymentProof,
              items: items.map((item) => ({
                listingId: item.listingId,
                variantId: item.variantId,
                quantity: item.quantity
              }))
            }
          : {
              paymentMethod,
              phone: guestForm.phone || user.phone || '',
              customerReference: paymentReference,
              paymentProof
            },
        idempotencyKey
      );

      if (isGuest) {
        clearGuestCart();
      }

      setItems([]);
      onCartUpdate(0);
      onOrderCreated(order);
      setCheckoutSuccess({
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoice?.invoiceNumber,
        emailStatus: order.emailStatus,
        status: order.status,
        trackingToken: order.trackingToken
      });
      setShowPaymentForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d enregistrer votre commande.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (checkoutSuccess) {
    return <CheckoutSuccessPanel checkoutSuccess={checkoutSuccess} isGuest={isGuest} navigateTo={navigateTo} />;
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
        paymentReference={paymentReference}
        paymentProof={paymentProof}
        guestForm={guestForm}
        isCheckingOut={isCheckingOut}
        formError={formError}
        paymentInstructions={PAYMENT_INSTRUCTIONS}
        onClose={() => setShowPaymentForm(false)}
        onSelectPaymentMethod={setPaymentMethod}
        onGuestFieldChange={handleGuestFieldChange}
        onPaymentReferenceChange={setPaymentReference}
        onPaymentProofChange={handlePaymentProofChange}
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
