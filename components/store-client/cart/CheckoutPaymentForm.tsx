import React from 'react';
import { ArrowRight, CreditCard, Lock, Smartphone, X } from 'lucide-react';
import { SiteConfig } from '../../../types';
import { GuestFormState, PaymentProofState } from './types';
import CheckoutIdentityForm from './CheckoutIdentityForm';

interface CheckoutPaymentFormProps {
  open: boolean;
  siteConfig: SiteConfig;
  isGuest: boolean;
  user: { phone?: string };
  total: number;
  paymentMethod: string;
  paymentReference: string;
  paymentProof: PaymentProofState;
  guestForm: GuestFormState;
  isCheckingOut: boolean;
  formError: string;
  paymentInstructions: Record<string, string>;
  onClose: () => void;
  onSelectPaymentMethod: (method: string) => void;
  onGuestFieldChange: (field: keyof GuestFormState, value: string) => void;
  onPaymentReferenceChange: (value: string) => void;
  onPaymentProofChange: (file: File | null) => void;
  onCheckout: () => void;
}

const inputClassName = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500';
const paymentMethods = ['whatsapp', 'edinar', 'flouci', 'bank_transfer', 'cash'];

const CheckoutPaymentForm: React.FC<CheckoutPaymentFormProps> = ({
  open,
  siteConfig,
  isGuest,
  user,
  total,
  paymentMethod,
  paymentReference,
  paymentProof,
  guestForm,
  isCheckingOut,
  formError,
  paymentInstructions,
  onClose,
  onSelectPaymentMethod,
  onGuestFieldChange,
  onPaymentReferenceChange,
  onPaymentProofChange,
  onCheckout
}) => {
  if (!open) return null;

  const methods = siteConfig.click2payEnabled ? [...paymentMethods, 'click2pay'] : paymentMethods;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Paiement</div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Choisir votre methode de paiement</h2>
            <p className="mt-1 text-sm text-slate-500">Apres validation, une facture TuniBots sera envoyee par email.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {methods.map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => onSelectPaymentMethod(pm)}
                className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                  paymentMethod === pm ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {pm === 'whatsapp' && <Lock size={22} className="mb-2" />}
                {pm === 'edinar' && <CreditCard size={22} className="mb-2" />}
                {pm === 'flouci' && <Smartphone size={22} className="mb-2" />}
                {pm === 'click2pay' && <CreditCard size={22} className="mb-2 text-amber-500" />}
                <span className="text-[11px] font-black uppercase">{pm}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
            <div className="font-black">Instructions de paiement</div>
            <p className="mt-1">{paymentInstructions[paymentMethod] || paymentInstructions.whatsapp}</p>
          </div>

          <CheckoutIdentityForm isGuest={isGuest} user={user} guestForm={guestForm} onGuestFieldChange={onGuestFieldChange} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Reference paiement (optionnel)</label>
              <input type="text" value={paymentReference} onChange={(e) => onPaymentReferenceChange(e.target.value)} placeholder="ID transaction / note agent" className={inputClassName} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Preuve paiement (optionnel)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => onPaymentProofChange(e.target.files?.[0] || null)} className={inputClassName} />
              {paymentProof && <div className="mt-2 text-xs font-semibold text-emerald-700">{paymentProof.fileName} pret a envoyer</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total a payer</span>
              <span className="font-bold">{total.toFixed(2)} TND</span>
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
            {isCheckingOut ? <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <>Confirmer la soumission paiement <ArrowRight size={20} className="ml-2" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPaymentForm;
