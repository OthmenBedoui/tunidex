import React, { useState } from 'react';
import OrderDeliveryPanel from '../../components/store-client/order/OrderDeliveryPanel';
import OrderTrackingForm from '../../components/store-client/order/OrderTrackingForm';
import OrderTrackingTimeline from '../../components/store-client/order/OrderTrackingTimeline';
import { api } from '../../services/api';
import { Order, OrderStatus } from '../../types';

type DeliveryItem = {
  id: string;
  deliveryContent: string;
  deliveryType: string;
  activationGuide?: string;
  restrictions?: string;
  region?: string;
};

const OrderTrackingPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [emailOrToken, setEmailOrToken] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<DeliveryItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    setLoading(true);
    setError('');
    setDelivery([]);
    try {
      const isToken = /^[a-f0-9]{40,}$/i.test(emailOrToken.trim());
      const tracked = await api.trackOrder(orderNumber.trim(), isToken ? { token: emailOrToken.trim() } : { email: emailOrToken.trim() });
      setOrder(tracked);
      if (tracked.status === OrderStatus.DELIVERED) {
        try {
          const delivered = await api.getOrderDelivery(tracked.orderNumber, isToken ? emailOrToken.trim() : undefined);
          setDelivery(delivered.deliveries);
        } catch {
          // Delivery can still be locked for email-only tracking.
        }
      }
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Commande introuvable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <OrderTrackingForm
        orderNumber={orderNumber}
        emailOrToken={emailOrToken}
        loading={loading}
        error={error}
        onOrderNumberChange={setOrderNumber}
        onEmailOrTokenChange={setEmailOrToken}
        onTrack={handleTrack}
      />

      {order && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-500">Commande</div>
              <div className="text-2xl font-black text-slate-950">{order.orderNumber}</div>
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase text-amber-700">{order.status}</div>
          </div>

          <OrderTrackingTimeline order={order} />
          <OrderDeliveryPanel delivery={delivery} />
        </div>
      )}
    </div>
  );
};

export default OrderTrackingPage;
