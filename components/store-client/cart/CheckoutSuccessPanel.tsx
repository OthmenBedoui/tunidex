import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CheckoutSuccessState } from './types';

interface CheckoutSuccessPanelProps {
  checkoutSuccess: CheckoutSuccessState;
  isGuest: boolean;
  navigateTo: (page: string) => void;
}

const CheckoutSuccessPanel: React.FC<CheckoutSuccessPanelProps> = ({ checkoutSuccess, isGuest, navigateTo }) => (
  <div className="mx-auto max-w-4xl px-4 py-16">
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 px-8 py-10 text-white">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-3xl font-black">Votre commande a bien ete enregistree</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200">Votre commande est en cours. Notre service support vous guidera dans les prochaines etapes.</p>
      </div>

      <div className="grid gap-6 p-8 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Commande</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{checkoutSuccess.orderNumber}</div>
            {checkoutSuccess.invoiceNumber && <div className="mt-2 text-sm text-slate-500">Facture / proforma: {checkoutSuccess.invoiceNumber}</div>}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p>Votre paiement est maintenant en revue manuelle.</p>
            <p className="mt-2">Le produit digital restera verrouille jusqu a validation du paiement et livraison explicite par un agent.</p>
            <p className="mt-2">Conservez votre numero de commande pour le suivi.</p>
            {isGuest && <p className="mt-2">Un email de suivi vous sera envoye. Pas besoin de copier un long token.</p>}
            {checkoutSuccess.emailStatus === 'FAILED' && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                L email n a pas pu etre envoye automatiquement, mais votre commande est bien enregistree.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">{isGuest ? 'Optionnel' : 'Suivi'}</div>
          <h2 className="mt-3 text-xl font-black text-slate-900">{isGuest ? 'Suivi invite disponible' : 'Votre compte est a jour'}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {isGuest
              ? 'Un lien ou token de suivi est envoye par email. Vous pouvez aussi creer un compte pour retrouver vos commandes plus facilement.'
              : 'Vous pouvez suivre cette commande depuis votre espace client et consulter votre historique a tout moment.'}
          </p>
          {isGuest ? (
            <button type="button" onClick={() => navigateTo('register')} className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
              Creer un compte
            </button>
          ) : (
            <button type="button" onClick={() => navigateTo('user-dashboard')} className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
              Voir mes commandes
            </button>
          )}
          <button type="button" onClick={() => navigateTo('home')} className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-white">
            Retour a la boutique
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CheckoutSuccessPanel;
