import React from 'react';
import { PackageCheck } from 'lucide-react';

interface DeliveryItem {
  id: string;
  deliveryContent: string;
  deliveryType: string;
  activationGuide?: string;
  restrictions?: string;
  region?: string;
}

interface OrderDeliveryPanelProps {
  delivery: DeliveryItem[];
}

const OrderDeliveryPanel: React.FC<OrderDeliveryPanelProps> = ({ delivery }) => {
  if (delivery.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
        Delivery page locked until payment is approved and an agent sends the product.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {delivery.map((item) => (
        <div key={item.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-2 flex items-center text-sm font-black text-emerald-800">
            <PackageCheck size={18} className="mr-2" /> {item.deliveryType}
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-mono text-sm text-slate-900">{item.deliveryContent}</pre>
        </div>
      ))}
    </div>
  );
};

export default OrderDeliveryPanel;
