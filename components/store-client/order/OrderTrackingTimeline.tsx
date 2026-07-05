import React from 'react';
import { CheckCircle2, Clock3, Lock } from 'lucide-react';
import { Order } from '../../../types';

interface OrderTrackingTimelineProps {
  order: Order;
  manualReviewEstimateHours?: number;
}

const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order, manualReviewEstimateHours = 4 }) => {
  const steps = order.statusHistory || [];

  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        La verification manuelle du paiement prend en general jusqu'a <strong>{manualReviewEstimateHours} heures</strong>.
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isDone = step.state === 'done';
            const isCurrent = step.state === 'current';

            return (
              <div key={step.key} className="relative flex gap-4">
                {index < steps.length - 1 && (
                  <div className={`absolute left-[17px] top-9 h-[calc(100%+14px)] w-px ${isDone ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                )}
                <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : isCurrent ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
                  {isDone ? <CheckCircle2 size={18} /> : isCurrent ? <Clock3 size={18} /> : <Lock size={18} />}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm font-black text-slate-900">{step.label}</div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isDone ? 'bg-emerald-50 text-emerald-700' : isCurrent ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {isDone ? 'Fait' : isCurrent ? 'En cours' : 'A venir'}
                    </span>
                  </div>
                  {step.description && <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>}
                  <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {step.happenedAt ? new Date(step.happenedAt).toLocaleString('fr-FR') : 'En attente'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 p-4 text-sm">
              <span className="font-bold text-slate-900">{item.titleSnapshot}</span>
              <span className="text-slate-500">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default OrderTrackingTimeline;
