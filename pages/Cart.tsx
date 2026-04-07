import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, Lock, ShoppingBag, Smartphone, Trash2, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { CartItem, Listing, SiteConfig, User } from '../types';
import { clearGuestCart, getGuestCartCount, getGuestCartItems, removeGuestCartItem } from '../utils/guestCart';
import { getListingFinalPrice } from '../utils/pricing';
import PriceDisplay from '../components/PriceDisplay';

interface CartProps {
  navigateTo: (page: string) => void;
  onCartUpdate: (count: number) => void;
  siteConfig: SiteConfig;
  listings: Listing[];
  user: User;
}

type GuestFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type CheckoutSuccessState = {
  orderNumber: string;
  invoiceNumber?: string;
  emailStatus?: string;
};

const Cart: React.FC<CartProps> = ({ navigateTo, onCartUpdate, siteConfig, listings, user }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('whatsapp');
  const [formError, setFormError] = useState('');
  const [guestForm, setGuestForm] = useState<GuestFormState>({
    firstName: user.fullName?.split(' ')[0] || '',
    lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
    email: user.email && user.id !== 'guest' ? user.email : '',
    phone: user.phone || ''
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState<CheckoutSuccessState | null>(null);

  const isGuest = user.id === 'guest';

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

    api.getCart()
      .then((data) => {
        setItems(data);
        onCartUpdate(data.reduce((acc, item) => acc + item.quantity, 0));
      })
      .catch(console.error);
  }, [isGuest, listings]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (getListingFinalPrice(item.listing) * item.quantity), 0),
    [items]
  );

  const handleRemove = async (item: CartItem) => {
    if (isGuest) {
      const nextItems = removeGuestCartItem(item.listingId);
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

  const handleCheckout = async () => {
    if (items.length === 0) {
      setFormError('Votre panier est vide.');
      return;
    }

    setIsCheckingOut(true);
    setFormError('');

    try {
      const order = isGuest
        ? await api.guestCheckout({
            ...guestForm,
            paymentMethod,
            items: items.map((item) => ({
              listingId: item.listingId,
              quantity: item.quantity
            }))
          })
        : await api.checkout({
            paymentMethod,
            phone: guestForm.phone || user.phone
          });

      if (isGuest) {
        clearGuestCart();
      }

      setItems([]);
      onCartUpdate(0);
      setCheckoutSuccess({
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoice?.invoiceNumber,
        emailStatus: order.emailStatus
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer votre commande.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (checkoutSuccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 px-8 py-10 text-white">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 mb-5">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-3xl font-black">Votre commande a bien été enregistrée</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Le paiement reste en attente de validation. Conservez votre numéro de commande pour le suivi.
            </p>
          </div>

          <div className="grid gap-6 p-8 md:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Commande</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{checkoutSuccess.orderNumber}</div>
                {checkoutSuccess.invoiceNumber && (
                  <div className="mt-2 text-sm text-slate-500">Facture / proforma: {checkoutSuccess.invoiceNumber}</div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <p>Une facture a été envoyée à votre adresse email.</p>
                <p className="mt-2">Un agent vous contactera sur WhatsApp pour finaliser le paiement.</p>
                <p className="mt-2">Conservez votre numéro de commande pour le suivi.</p>
                {checkoutSuccess.emailStatus === 'FAILED' && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    L’email n’a pas pu être envoyé automatiquement, mais votre commande est bien enregistrée.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Optionnel</div>
              <h2 className="mt-3 text-xl font-black text-slate-900">Créez un compte</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Créez un compte pour consulter votre historique d’achat, accéder à vos factures et profiter de points de fidélité.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Créer un compte
              </button>
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-white"
              >
                Retour à la boutique
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-300">
          <ShoppingBag size={64} className="text-slate-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Votre panier est vide</h2>
        <button onClick={() => navigateTo('home')} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1">
          Parcourir la Boutique
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-black mb-8 flex items-center text-slate-900">
        <ShoppingBag className="mr-3" />
        Mon Panier
        <span className="ml-3 text-lg font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{items.length} articles</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center transition-all hover:shadow-md">
              <img src={item.listing.imageUrl} alt={item.listing.title} className="w-24 h-24 object-cover rounded-xl sm:mr-6 mb-4 sm:mb-0 shadow-sm" />
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-indigo-600 uppercase mb-1">{item.listing.game}</div>
                <h3 className="font-bold text-slate-900 text-xl mb-1">{item.listing.title}</h3>
                <p className="text-sm text-slate-400">{item.listing.description}</p>
              </div>
              <div className="text-right mx-6 mt-4 sm:mt-0">
                <PriceDisplay listing={item.listing} priceClassName="font-black text-xl text-slate-900" />
                <div className="text-xs font-medium text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded mt-1">Qté: {item.quantity}</div>
              </div>
              <button onClick={() => handleRemove(item)} className="text-slate-300 hover:text-indigo-500 p-3 hover:bg-indigo-50 rounded-xl transition-all mt-4 sm:mt-0">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 sticky top-24">
            <h3 className="font-bold text-xl mb-6 flex items-center">
              <Wallet size={20} className="mr-2" />
              Validation de commande
            </h3>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
              Votre commande sera enregistrée avec paiement en attente. Un agent Tunidex vous contactera sur WhatsApp pour finaliser le règlement.
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
              {['whatsapp', 'edinar', 'flouci', ...(siteConfig.click2payEnabled ? ['click2pay'] : [])].map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`border rounded-xl p-3 flex flex-col items-center justify-center transition-all ${paymentMethod === pm ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                >
                  {pm === 'whatsapp' && <Lock size={20} className="mb-1" />}
                  {pm === 'edinar' && <CreditCard size={20} className="mb-1" />}
                  {pm === 'flouci' && <Smartphone size={20} className="mb-1" />}
                  {pm === 'click2pay' && <CreditCard size={20} className="mb-1 text-amber-500" />}
                  <span className="text-[10px] font-bold uppercase">{pm}</span>
                </button>
              ))}
            </div>

            {isGuest && (
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={guestForm.firstName}
                      onChange={(e) => handleGuestFieldChange('firstName', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={guestForm.lastName}
                      onChange={(e) => handleGuestFieldChange('lastName', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) => handleGuestFieldChange('email', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Numéro de téléphone</label>
                  <input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => handleGuestFieldChange('phone', e.target.value)}
                    placeholder="+216 xx xxx xxx"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {!isGuest && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 mb-8 text-sm text-slate-600">
                <div className="font-bold text-slate-900">{user.fullName || user.username}</div>
                <div>{user.email}</div>
                <div>{guestForm.phone || user.phone || 'Numéro WhatsApp à confirmer par l’agent.'}</div>
              </div>
            )}

            <div className="space-y-4 mb-8 text-sm text-slate-600">
              <div className="flex justify-between"><span>Sous-total</span> <span className="font-medium">{total.toFixed(2)} TND</span></div>
              <div className="border-t border-dashed pt-4 flex justify-between text-2xl font-black text-slate-900">
                <span>Total</span>
                <span>{total.toFixed(2)} <span className="text-sm text-slate-400 font-normal">TND</span></span>
              </div>
            </div>

            {formError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center disabled:opacity-70 shadow-lg"
            >
              {isCheckingOut ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              ) : (
                <>Enregistrer la commande <ArrowRight size={20} className="ml-2" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
