import React from 'react';
import { ArrowRight, CreditCard, Landmark, Smartphone, Wallet, X } from 'lucide-react';
import { PaymentMethodConfig, SiteConfig } from '../../../types';
import { CouponCheckoutState, GuestFormState, LoyaltyCheckoutState } from './types';
import CheckoutIdentityForm from './CheckoutIdentityForm';

interface CheckoutPaymentFormProps {
  open: boolean;
  siteConfig: SiteConfig;
  isGuest: boolean;
  user: { phone?: string };
  total: number;
  paymentMethod: string;
  guestForm: GuestFormState;
  loyaltyState?: LoyaltyCheckoutState;
  couponState?: CouponCheckoutState;
  isCheckingOut: boolean;
  formError: string;
  onClose: () => void;
  onSelectPaymentMethod: (method: string) => void;
  onToggleLoyaltyPoints: (value: boolean) => void;
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onGuestFieldChange: (field: keyof GuestFormState, value: string) => void;
  onCheckout: () => void;
}

const CheckoutPaymentForm: React.FC<CheckoutPaymentFormProps> = ({
  open,
  siteConfig,
  isGuest,
  user,
  total,
  paymentMethod,
  guestForm,
  loyaltyState,
  couponState,
  isCheckingOut,
  formError,
  onClose,
  onSelectPaymentMethod,
  onToggleLoyaltyPoints,
  onCouponCodeChange,
  onApplyCoupon,
  onGuestFieldChange,
  onCheckout
}) => {
  if (!open) return null;

  const methods = (siteConfig.paymentMethods || []).filter((method) => method.isActive);
  const selectedMethod = methods.find((method) => method.id === paymentMethod) || methods[0];
  const iconByMethod = (method: PaymentMethodConfig) => {
    if (method.id.includes('bank')) return <Landmark size={22} className="mb-2" />;
    if (method.id.includes('d17') || method.id.includes('flouci')) return <Smartphone size={22} className="mb-2" />;
    if (method.id.includes('cash')) return <Wallet size={22} className="mb-2" />;
    return <CreditCard size={22} className="mb-2" />;
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Paiement</div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Choisir votre methode de paiement</h2>
            <p className="mt-1 text-sm text-slate-500">Apres validation, nous creons la commande puis nous vous affichons les instructions exactes et le formulaire de preuve.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {methods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => onSelectPaymentMethod(pm.id)}
                className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                  paymentMethod === pm.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {iconByMethod(pm)}
                <span className="text-center text-[11px] font-black uppercase">{pm.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
            <div className="font-black">Instructions de paiement</div>
            <p className="mt-1">{selectedMethod?.instructions || 'Selectionnez une methode pour voir les instructions detaillees.'}</p>
          </div>

          <CheckoutIdentityForm isGuest={isGuest} user={user} guestForm={guestForm} onGuestFieldChange={onGuestFieldChange} />

          {loyaltyState?.loyalty && loyaltyState.loyalty.balance > 0 && (
            <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <input
                type="checkbox"
                checked={loyaltyState.useLoyaltyPoints}
                onChange={(event) => onToggleLoyaltyPoints(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600"
              />
              <div>
                <div className="font-black">Utiliser mes points</div>
                <div className="mt-1 leading-6">
                  Solde disponible: <strong>{loyaltyState.loyalty.balance} pts</strong> ({loyaltyState.loyalty.redeemableAmount.toFixed(2)} TND)
                  {loyaltyState.useLoyaltyPoints && loyaltyState.estimatedDiscount > 0 && `, reduction estimee: ${loyaltyState.estimatedDiscount.toFixed(2)} TND`}
                </div>
              </div>
            </label>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-sm font-black text-slate-900">Code promo</div>
            <div className="flex gap-2">
              <input
                value={couponState?.couponCode || ''}
                onChange={(event) => onCouponCodeChange(event.target.value)}
                placeholder="Ex: SUMMER10"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={onApplyCoupon}
                disabled={couponState?.isApplying}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {couponState?.isApplying ? 'Validation...' : 'Appliquer'}
              </button>
            </div>
            {couponState?.validation?.code && couponState.validation.discountAmount > 0 && (
              <div className="mt-2 text-sm text-emerald-700">
                {couponState.validation.code} applique: -{couponState.validation.discountAmount.toFixed(2)} TND
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total a payer</span>
              <span className="font-bold">{(total - (couponState?.validation?.discountAmount || 0) - (loyaltyState?.useLoyaltyPoints ? loyaltyState.estimatedDiscount : 0)).toFixed(2)} TND</span>
            </div>
          </div>

          {formError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          <button
            onClick={onCheckout}
            disabled={isCheckingOut}
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-4 font-bold text-white shadow-lg transition hover:bg-black disabled:opacity-70"
          >
            {isCheckingOut ? <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <>Creer la commande et voir les instructions <ArrowRight size={20} className="ml-2" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPaymentForm;
