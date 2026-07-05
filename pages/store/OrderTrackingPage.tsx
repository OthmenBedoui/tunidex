import React, { useState } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import PaymentInstructionsCard from '../../components/store-client/order/PaymentInstructionsCard';
import OrderDeliveryPanel from '../../components/store-client/order/OrderDeliveryPanel';
import OrderTrackingForm from '../../components/store-client/order/OrderTrackingForm';
import OrderTrackingTimeline from '../../components/store-client/order/OrderTrackingTimeline';
import { api } from '../../services/api';
import { Order, OrderStatus, SiteConfig } from '../../types';
import { handleApiError } from '../../utils/apiError';
import { buildStoreWhatsappUrl } from '../../utils/whatsapp';

type DeliveryItem = {
  id: string;
  deliveryContent: string;
  deliveryType: string;
  activationGuide?: string;
  restrictions?: string;
  region?: string;
};

const OrderTrackingPage: React.FC<{ onNotify: (message: string, type?: 'success' | 'error') => void; initialOrderNumber?: string; siteConfig: SiteConfig }> = ({ onNotify, initialOrderNumber = '', siteConfig }) => {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [emailOrToken, setEmailOrToken] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<DeliveryItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const whatsappLink = order
    ? buildStoreWhatsappUrl(siteConfig, `Commande ${order.orderNumber}, j'ai besoin d'aide pour le suivi de ma commande.`)
    : null;

  React.useEffect(() => {
    setOrderNumber(initialOrderNumber);
  }, [initialOrderNumber]);

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
        } catch (error) {
          handleApiError({
            error,
            fallbackMessage: 'La livraison n est pas encore disponible pour cette commande.',
            logContext: 'Unable to load order delivery details'
          });
        }
      }
    } catch (error) {
      setOrder(null);
      const message = handleApiError({
        error,
        fallbackMessage: 'Commande introuvable.',
        notify: onNotify,
        logContext: 'Order tracking failed'
      });
      setError(message);
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
        <div className="mt-6 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-500">Commande</div>
                <div className="text-2xl font-black text-slate-950">{order.orderNumber}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                  >
                    <MessageCircle size={16} />
                    Contacter WhatsApp
                    <ExternalLink size={15} />
                  </a>
                )}
                <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase text-amber-700">{order.status}</div>
              </div>
            </div>

            <OrderTrackingTimeline order={order} manualReviewEstimateHours={siteConfig.paymentReviewReminderHours || 4} />
            <OrderDeliveryPanel delivery={delivery} />
          </div>

          {[
            OrderStatus.PENDING_PAYMENT,
            OrderStatus.PAYMENT_UNDER_REVIEW,
            OrderStatus.PAYMENT_RECEIVED,
            OrderStatus.PAYMENT_REJECTED
          ].includes(order.status) && (
            <PaymentInstructionsCard
              order={order}
              siteConfig={siteConfig}
              onNotify={onNotify}
              onOrderUpdated={setOrder}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingPage;
