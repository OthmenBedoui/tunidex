import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Order, OrderStatus } from '../../../types';

const steps = [
  { status: OrderStatus.PAYMENT_UNDER_REVIEW, label: 'Order received' },
  { status: OrderStatus.PAYMENT_APPROVED, label: 'Payment approved' },
  { status: OrderStatus.IN_DELIVERY, label: 'In delivery' },
  { status: OrderStatus.DELIVERED, label: 'Delivered' }
];

const stepIndex = (status?: OrderStatus) => {
  if (!status) return -1;
  if ([OrderStatus.PENDING_PAYMENT, OrderStatus.IN_PROGRESS, OrderStatus.PAYMENT_UNDER_REVIEW].includes(status)) return 0;
  if ([OrderStatus.PAYMENT_RECEIVED, OrderStatus.PAYMENT_APPROVED].includes(status)) return 1;
  if (status === OrderStatus.IN_DELIVERY) return 2;
  if ([OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(status)) return 3;
  return -1;
};

interface OrderTrackingTimelineProps {
  order: Order;
}

const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order }) => {
  const currentIndex = stepIndex(order.status);

  return (
    <>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.status} className={`rounded-2xl border p-4 ${currentIndex >= index ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            {currentIndex >= index ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Lock size={20} className="text-slate-400" />}
            <div className="mt-2 text-sm font-black text-slate-900">{step.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 p-4 text-sm">
            <span className="font-bold text-slate-900">{item.titleSnapshot}</span>
            <span className="text-slate-500">x{item.quantity}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default OrderTrackingTimeline;
