import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import { Coupon } from '../../../types';
import { handleApiError } from '../../../utils/apiError';

type AdminCouponsSectionProps = {
  onNotify: (toast: { type: 'success' | 'error'; title: string; message: string }) => void;
};

const emptyDraft = {
  code: '',
  type: 'PERCENT' as 'PERCENT' | 'FIXED',
  value: '',
  minAmount: '',
  maxUses: '',
  validFrom: '',
  validTo: '',
  active: true
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
};

const AdminCouponsSection: React.FC<AdminCouponsSectionProps> = ({ onNotify }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setCoupons(await api.getAdminCoupons());
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible de charger les coupons.',
        notify: (message) => onNotify({ type: 'error', title: 'Chargement impossible', message }),
        logContext: 'Unable to load admin coupons'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        code: draft.code,
        type: draft.type,
        value: Number(draft.value),
        minAmount: draft.minAmount ? Number(draft.minAmount) : null,
        maxUses: draft.maxUses ? Number(draft.maxUses) : null,
        validFrom: draft.validFrom ? new Date(draft.validFrom).toISOString() : null,
        validTo: draft.validTo ? new Date(draft.validTo).toISOString() : null,
        active: draft.active
      };

      if (editingId) {
        await api.updateAdminCoupon(editingId, payload);
        onNotify({ type: 'success', title: 'Coupon mis a jour', message: 'Les changements ont ete enregistres.' });
      } else {
        await api.createAdminCoupon(payload);
        onNotify({ type: 'success', title: 'Coupon cree', message: 'Le nouveau coupon est pret a etre utilise.' });
      }

      resetDraft();
      await loadCoupons();
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible d enregistrer ce coupon.',
        notify: (message) => onNotify({ type: 'error', title: 'Enregistrement impossible', message }),
        logContext: 'Unable to save admin coupon'
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setDraft({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minAmount: coupon.minAmount != null ? String(coupon.minAmount) : '',
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : '',
      validFrom: toDateTimeLocalValue(coupon.validFrom),
      validTo: toDateTimeLocalValue(coupon.validTo),
      active: coupon.active
    });
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Supprimer le coupon ${coupon.code} ?`)) return;
    try {
      await api.deleteAdminCoupon(coupon.id);
      onNotify({ type: 'success', title: 'Coupon supprime', message: `${coupon.code} a ete retire.` });
      if (editingId === coupon.id) resetDraft();
      await loadCoupons();
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible de supprimer ce coupon.',
        notify: (message) => onNotify({ type: 'error', title: 'Suppression impossible', message }),
        logContext: 'Unable to delete admin coupon'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Coupons</div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Gestion des codes promo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Créez, modifiez ou désactivez les coupons. Les stats d’utilisation remontent directement à partir des commandes validées.</p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <TicketPercent size={24} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900">{editingId ? 'Modifier le coupon' : 'Nouveau coupon'}</h3>
          {editingId && (
            <button type="button" onClick={resetDraft} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Annuler l edition
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input value={draft.code} onChange={(e) => setDraft((current) => ({ ...current, code: e.target.value.toUpperCase() }))} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" placeholder="Code promo" />
          <select value={draft.type} onChange={(e) => setDraft((current) => ({ ...current, type: e.target.value as 'PERCENT' | 'FIXED' }))} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700">
            <option value="PERCENT">Pourcentage</option>
            <option value="FIXED">Montant fixe</option>
          </select>
          <input value={draft.value} onChange={(e) => setDraft((current) => ({ ...current, value: e.target.value }))} type="number" min="0" step="0.01" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" placeholder="Valeur" />
          <input value={draft.minAmount} onChange={(e) => setDraft((current) => ({ ...current, minAmount: e.target.value }))} type="number" min="0" step="0.01" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" placeholder="Montant minimum" />
          <input value={draft.maxUses} onChange={(e) => setDraft((current) => ({ ...current, maxUses: e.target.value }))} type="number" min="1" step="1" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" placeholder="Utilisations max" />
          <input value={draft.validFrom} onChange={(e) => setDraft((current) => ({ ...current, validFrom: e.target.value }))} type="datetime-local" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" />
          <input value={draft.validTo} onChange={(e) => setDraft((current) => ({ ...current, validTo: e.target.value }))} type="datetime-local" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700" />
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
            Coupon actif
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            {editingId ? 'Mettre a jour' : 'Creer le coupon'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 text-sm font-black text-slate-900">Coupons et statistiques</div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Chargement des coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Aucun coupon configure pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Regle</th>
                  <th className="px-6 py-3">Usage</th>
                  <th className="px-6 py-3">Remises</th>
                  <th className="px-6 py-3">Etat</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900">{coupon.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{coupon.type === 'PERCENT' ? `${coupon.value}%` : `${coupon.value.toFixed(2)} TND`}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>Min: {coupon.minAmount != null ? `${coupon.minAmount.toFixed(2)} TND` : 'Aucun'}</div>
                      <div>Max uses: {coupon.maxUses ?? 'Illimite'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>{coupon.usedCount} utilisation(s)</div>
                      <div className="text-xs text-slate-400">Stats: {coupon.usageCount ?? coupon.usedCount}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{(coupon.totalDiscountAmount || 0).toFixed(2)} TND</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {coupon.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button type="button" onClick={() => startEdit(coupon)} className="text-slate-400 hover:text-indigo-600">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => handleDelete(coupon)} className="text-slate-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCouponsSection;
