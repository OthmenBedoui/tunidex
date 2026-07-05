import React, { useMemo, useState } from 'react';
import { ExternalLink, Upload, Wallet } from 'lucide-react';
import { api } from '../../../services/api';
import { Order, PaymentMethodConfig, SiteConfig } from '../../../types';
import { handleApiError } from '../../../utils/apiError';
import { buildStoreWhatsappUrl } from '../../../utils/whatsapp';

type PaymentInstructionsCardProps = {
  order: Order;
  siteConfig: SiteConfig;
  onNotify: (message: string, type?: 'success' | 'error') => void;
  onOrderUpdated: (order: Order) => void;
};

const FALLBACK_METHOD: PaymentMethodConfig = {
  id: 'manual_payment',
  label: 'Paiement manuel',
  instructions: 'Envoyez votre paiement selon les coordonnees communiquees par TuniBots et mentionnez votre numero de commande.',
  accountDetails: 'Coordonnees a confirmer par le support.',
  isActive: true,
  sortOrder: 999
};

const isProofEditableStatus = (status: Order['status']) => (
  ['PENDING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'PAYMENT_RECEIVED', 'PAYMENT_REJECTED'].includes(status)
);

const PaymentInstructionsCard: React.FC<PaymentInstructionsCardProps> = ({ order, siteConfig, onNotify, onOrderUpdated }) => {
  const [reference, setReference] = useState(order.payments?.[0]?.reference || order.payments?.[0]?.customerReference || '');
  const [email, setEmail] = useState(order.customerEmail || '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewName, setProofPreviewName] = useState('');
  const [proofMessage, setProofMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethod = useMemo(() => {
    const configured = (siteConfig.paymentMethods || [])
      .find((method) => method.id === (order.paymentMethod || '').toLowerCase());
    return configured || {
      ...FALLBACK_METHOD,
      id: (order.paymentMethod || FALLBACK_METHOD.id).toLowerCase(),
      label: order.paymentMethod || FALLBACK_METHOD.label
    };
  }, [order.paymentMethod, siteConfig.paymentMethods]);

  const whatsappLink = useMemo(() => buildStoreWhatsappUrl(
    siteConfig,
    `Commande ${order.orderNumber}, j'ai paye par ${paymentMethod.label}, voici ma preuve`
  ), [order.orderNumber, paymentMethod.label, siteConfig]);

  const handleFileChange = (file: File | null) => {
    setProofFile(file);
    setProofPreviewName(file?.name || '');
  };

  const handleSubmit = async () => {
    if (!reference.trim() && !proofFile) {
      onNotify('Ajoutez une capture de paiement ou une reference de transaction.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        const uploaded = await api.uploadPaymentProofImage(proofFile);
        proofUrl = uploaded.url;
      }

      const updated = await api.submitOrderPaymentProof(order.orderNumber, {
        email: order.customerType === 'GUEST' ? email.trim() : undefined,
        reference: reference.trim() || undefined,
        proofUrl,
        paymentMethod: paymentMethod.id,
        proofMessage: proofMessage.trim() || undefined
      });

      onOrderUpdated(updated);
      setProofFile(null);
      setProofPreviewName('');
      onNotify('Preuve de paiement envoyee. L equipe a ete alertee.', 'success');
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: "Impossible d'envoyer la preuve de paiement.",
        notify: onNotify,
        logContext: 'Unable to submit payment proof'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
            <Wallet size={14} />
            Paiement
          </div>
          <h3 className="mt-3 text-2xl font-black text-slate-950">{paymentMethod.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{paymentMethod.instructions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Montant</div>
          <div className="mt-1 text-xl font-black text-slate-950">{(order.total ?? order.amount).toFixed(2)} {order.currency || 'TND'}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Coordonnees et consignes</div>
          <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{paymentMethod.accountDetails}</pre>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="text-xs font-black uppercase tracking-widest text-amber-700">Reference obligatoire</div>
          <div className="mt-2 text-2xl font-black">{order.orderNumber}</div>
          <p className="mt-2 leading-6">Mentionnez exactement ce numero dans votre paiement ou votre message support pour accelerer la verification.</p>
        </div>
      </div>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
        >
          Envoyer via WhatsApp <ExternalLink size={16} />
        </a>
      )}

      {isProofEditableStatus(order.status) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-black text-slate-900">Soumettre votre preuve de paiement</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {order.customerType === 'GUEST' && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email de verification</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Reference de transaction</label>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ex: D17-458932 / virement 01923"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Capture de paiement</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
              />
              {proofPreviewName && <div className="mt-2 text-xs font-semibold text-emerald-700">{proofPreviewName}</div>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Message complementaire</label>
              <textarea
                value={proofMessage}
                onChange={(event) => setProofMessage(event.target.value)}
                placeholder="Ex: paiement envoye depuis le compte de mon frere / virement effectue a 14h02"
                className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-60"
            >
              <Upload size={16} />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer la preuve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInstructionsCard;
