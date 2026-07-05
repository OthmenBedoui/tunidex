import React from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { User } from '../../../types';
import { CouponCheckoutState, GuestFormState, LoyaltyCheckoutState } from './types';

interface CartSummaryCardProps {
  total: number;
  isGuest: boolean;
  user: User;
  guestForm: GuestFormState;
  loyaltyState?: LoyaltyCheckoutState;
  couponState?: CouponCheckoutState;
  isCheckingOut: boolean;
  formError: string;
  onOpenPayment: () => void;
}

const CartSummaryCard: React.FC<CartSummaryCardProps> = ({
  total,
  isGuest,
  user,
  guestForm,
  loyaltyState,
  couponState,
  isCheckingOut,
  formError,
  onOpenPayment
}) => (
  <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
    <h3 className="mb-6 flex items-center text-xl font-bold">
      <Wallet size={20} className="mr-2" />
      Validation de commande
    </h3>

    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Cliquez sur confirmer le paiement pour choisir votre methode. Une facture TuniBots sera envoyee par email, puis notre support vous guidera.
    </div>

    {!isGuest && (
      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        <div className="font-bold text-slate-900">{user.fullName || user.username}</div>
        <div>{user.email}</div>
        <div>{guestForm.phone || user.phone || 'Numero WhatsApp a confirmer par l agent.'}</div>
      </div>
    )}

    <div className="mb-8 space-y-4 text-sm text-slate-600">
      <div className="flex justify-between">
        <span>Sous-total</span>
        <span className="font-medium">{total.toFixed(2)} TND</span>
      </div>
      {(couponState?.validation?.discountAmount || 0) > 0 && (
        <div className="flex justify-between text-indigo-700">
          <span>Code promo {couponState?.validation?.code}</span>
          <span className="font-bold">- {couponState?.validation?.discountAmount.toFixed(2)} TND</span>
        </div>
      )}
      {loyaltyState?.useLoyaltyPoints && loyaltyState.estimatedDiscount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>Reduction fidelite</span>
          <span className="font-bold">- {loyaltyState.estimatedDiscount.toFixed(2)} TND</span>
        </div>
      )}
      <div className="flex justify-between border-t border-dashed pt-4 text-2xl font-black text-slate-900">
        <span>Total</span>
        <span>
          {(total - (couponState?.validation?.discountAmount || 0) - (loyaltyState?.useLoyaltyPoints ? loyaltyState.estimatedDiscount : 0)).toFixed(2)} <span className="text-sm font-normal text-slate-400">TND</span>
        </span>
      </div>
    </div>

    {formError && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}

    <button
      onClick={onOpenPayment}
      disabled={isCheckingOut}
      className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-4 font-bold text-white shadow-lg transition-all hover:bg-black disabled:opacity-70"
    >
      Confirmer le paiement <ArrowRight size={20} className="ml-2" />
    </button>
  </div>
);

export default CartSummaryCard;
