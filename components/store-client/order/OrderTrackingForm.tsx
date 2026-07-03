import React from 'react';
import { Search } from 'lucide-react';

interface OrderTrackingFormProps {
  orderNumber: string;
  emailOrToken: string;
  loading: boolean;
  error: string;
  onOrderNumberChange: (value: string) => void;
  onEmailOrTokenChange: (value: string) => void;
  onTrack: () => void;
}

const OrderTrackingForm: React.FC<OrderTrackingFormProps> = ({
  orderNumber,
  emailOrToken,
  loading,
  error,
  onOrderNumberChange,
  onEmailOrTokenChange,
  onTrack
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Suivi commande</div>
    <h1 className="mt-2 text-3xl font-black text-slate-950">Track your Tunibots order</h1>
    <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <input value={orderNumber} onChange={(e) => onOrderNumberChange(e.target.value)} placeholder="CMD-2026-000001" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
      <input value={emailOrToken} onChange={(e) => onEmailOrTokenChange(e.target.value)} placeholder="Email ou token de suivi" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
      <button onClick={onTrack} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
        <Search size={16} className="mr-2" /> Suivre
      </button>
    </div>
    {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
  </div>
);

export default OrderTrackingForm;
