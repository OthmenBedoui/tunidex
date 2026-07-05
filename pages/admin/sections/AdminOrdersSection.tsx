import React, { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import AdminTablePagination from '../../../components/admin/AdminTablePagination';
import { AdminEmptyState } from '../../../components/admin/AdminWorkspace';
import { api } from '../../../services/api';
import { useAdminOrdersPage } from '../../../src/hooks/useAdminOrdersPage';
import { AdminOrderListSort, OrderStatus } from '../../../types';
import { handleApiError } from '../../../utils/apiError';

type DeliveryDraft = {
  orderItemId: string;
  deliveryType: string;
  deliveryContent: string;
  activationGuide: string;
  restrictions: string;
  region: string;
};

interface AdminOrdersSectionProps {
  expandedOrderId: string | null;
  deliveryDrafts: Record<string, DeliveryDraft>;
  setExpandedOrderId: (value: string | null) => void;
  setDeliveryDrafts: React.Dispatch<React.SetStateAction<Record<string, DeliveryDraft>>>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAdminOrderAction: (action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery', orderId: string, payload?: unknown) => Promise<void>;
  onResendOrderInvoiceEmail: (orderId: string) => Promise<void>;
  requestOrderStatusChange: (orderId: string, currentStatus: OrderStatus, nextStatus: OrderStatus) => void;
  onRequestRejectPayment: (orderId: string) => void;
  getOrderStepIndex: (status: OrderStatus) => number;
  getOrderStatusClasses: (status: OrderStatus) => string;
  ORDER_STATUS_LABELS: Record<OrderStatus, string>;
  ORDER_STATUS_STEPS: Array<{ status: OrderStatus; label: string; description: string }>;
}

const paymentLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  edinar: 'EDINAR',
  flouci: 'Flouci',
  click2pay: 'Click2Pay',
  carte: 'Carte',
  bank_transfer: 'Virement bancaire',
  d17: 'D17',
  flouci_manual: 'Flouci manuel'
};

const buildAdminWhatsappUrl = (phone: string | null | undefined, message: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

const AdminOrdersSection: React.FC<AdminOrdersSectionProps> = ({
  expandedOrderId,
  deliveryDrafts,
  setExpandedOrderId,
  setDeliveryDrafts,
  onUpdateStatus,
  onAdminOrderAction,
  onResendOrderInvoiceEmail,
  requestOrderStatusChange,
  onRequestRejectPayment,
  getOrderStepIndex,
  getOrderStatusClasses,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS
}) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>(OrderStatus.PAYMENT_UNDER_REVIEW);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<AdminOrderListSort>('oldest');
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  const ordersQuery = useAdminOrdersPage({
    page,
    limit,
    status: orderFilter,
    q: orderSearch,
    sort: orderSort
  });

  useEffect(() => {
    if (ordersQuery.error) {
      handleApiError({
        error: ordersQuery.error,
        fallbackMessage: 'Impossible de charger les commandes admin.',
        logContext: 'Unable to load paginated admin orders'
      });
    }
  }, [ordersQuery.error]);

  const orders = ordersQuery.data?.items || [];
  const totalOrders = ordersQuery.data?.total || 0;
  const isDeliveredStatus = (status: OrderStatus) => [OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(status);
  const isActiveStatus = (status: OrderStatus) => ![OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status);
  const activeOrders = orders.filter((order) => isActiveStatus(order.status));
  const deliveredOrders = orders.filter((order) => isDeliveredStatus(order.status));
  const cancelledOrders = orders.filter((order) => order.status === OrderStatus.CANCELLED);
  const reviewOrders = [...orders]
    .filter((order) => [OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.PAYMENT_RECEIVED].includes(order.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const revenue = orders.filter((order) => order.status !== OrderStatus.CANCELLED).reduce((sum, order) => sum + order.amount, 0);
  const pendingEmail = orders.filter((order) => order.emailStatus === 'FAILED' || order.emailStatus === 'PENDING').length;

  const downloadInvoice = async (orderId: string, fallbackFileName?: string) => {
    setInvoiceLoadingId(orderId);
    try {
      const blob = await api.downloadOrderInvoicePdf(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fallbackFileName || `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible de telecharger la facture.',
        logContext: `Unable to download invoice for order ${orderId}`
      });
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-xl">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-200">
              <LucideIcons.Briefcase size={14} />
              Command center
            </div>
            <h2 className="mt-4 text-3xl font-black">Dashboard commandes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Vue CRM pour traiter les commandes, suivre les clients, contrôler les factures et prioriser les actions support.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">File de travail</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-3xl font-black">{activeOrders.length}</div>
                <div className="text-xs text-slate-400">à traiter</div>
              </div>
              <div>
                <div className="text-3xl font-black">{pendingEmail}</div>
                <div className="text-xs text-slate-400">emails à vérifier</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total commandes', totalOrders, 'Correspond aux filtres actifs'],
          ['En cours', activeOrders.length, 'Dans cette page'],
          ['Livrées', deliveredOrders.length, 'Dans cette page'],
          ['Annulées', cancelledOrders.length, 'Dans cette page'],
          ['CA commandes', `${revenue.toFixed(2)} TND`, 'Dans cette page']
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{hint}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="relative">
            <LucideIcons.Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              value={orderSearch}
              onChange={(e) => {
                setOrderSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher par numero, email client ou titre produit..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={orderSort}
            onChange={(e) => {
              setOrderSort(e.target.value as AdminOrderListSort);
              setPage(1);
            }}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="newest">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="amount-desc">Montant décroissant</option>
            <option value="amount-asc">Montant croissant</option>
          </select>
          <div className="flex flex-wrap gap-2">
            {(['all', OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.PAYMENT_RECEIVED, OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.CANCELLED] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setOrderFilter(status as 'all' | OrderStatus);
                  setPage(1);
                }}
                className={`h-10 rounded-xl px-4 text-xs font-black transition ${orderFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {status === 'all' ? 'Tous' : ORDER_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          {ordersQuery.isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm">
              Chargement des commandes...
            </div>
          )}
          {orders.map((o) => {
            const currentStepIndex = getOrderStepIndex(o.status);
            const isExpanded = expandedOrderId === o.id;
            const customerName = o.buyerDisplayName || [o.customerFirstName, o.customerLastName].filter(Boolean).join(' ') || o.buyer?.username || 'Client';
            const payment = o.payments?.[0];
            const deliveryDraft = deliveryDrafts[o.id] || { orderItemId: o.items[0]?.id || '', deliveryType: o.items[0]?.deliveryType || 'MIXED', deliveryContent: '', activationGuide: '', restrictions: '', region: '' };
            const updateDeliveryDraft = (patch: Partial<typeof deliveryDraft>) => setDeliveryDrafts((current) => ({ ...current, [o.id]: { ...deliveryDraft, ...patch } }));
            return (
              <div key={o.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="grid gap-4 p-5 lg:grid-cols-[1fr_180px_190px] lg:items-center">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-700">{o.orderNumber}</span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${getOrderStatusClasses(o.status)}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${o.emailStatus === 'SENT' ? 'bg-emerald-50 text-emerald-700' : o.emailStatus === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        Email {o.emailStatus || 'PENDING'}
                      </span>
                      {payment && (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${['APPROVED', 'PAID'].includes(payment.status) ? 'bg-emerald-50 text-emerald-700' : payment.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          Paiement {payment.status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-black text-slate-700">
                        {customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900">{customerName}</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="break-all">{o.customerEmail || o.buyer?.email || 'Email indisponible'}</span>
                          <span>{o.customerPhone || 'Téléphone indisponible'}</span>
                        </div>
                        <div className="mt-2 line-clamp-1 text-sm text-slate-600">
                          {o.items.map((item) => item.titleSnapshot).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Paiement</div>
                    <div className="mt-2 font-black text-slate-900">{paymentLabels[(o.paymentMethod || '').toLowerCase()] || o.paymentMethod || 'À confirmer'}</div>
                    <div className="mt-1 text-xs text-slate-500">{o.invoice?.invoiceNumber ? `Facture ${o.invoice.invoiceNumber}` : 'Facture non liée'}</div>
                    {(payment?.reference || payment?.customerReference) && <div className="mt-1 break-all text-xs text-slate-500">Ref: {payment?.reference || payment?.customerReference}</div>}
                    {(payment?.proofUrl || payment?.proofFileUrl) && <div className="mt-1 break-all text-xs font-semibold text-indigo-600">Preuve: {payment?.proofUrl || payment?.proofFileUrl}</div>}
                  </div>
                  <div className="space-y-3">
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">{o.amount.toFixed(2)} TND</div>
                      <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString('fr-FR')}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                        {isExpanded ? 'Fermer' : 'Détails'}
                      </button>
                      {[OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.PAYMENT_RECEIVED].includes(o.status) ? (
                        <button type="button" onClick={() => onAdminOrderAction('approvePayment', o.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                          Approuver
                        </button>
                      ) : o.status !== OrderStatus.DELIVERED ? (
                        <button type="button" onClick={() => onAdminOrderAction('sendDelivery', o.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                          Envoyer
                        </button>
                      ) : (
                        <button type="button" onClick={() => onUpdateStatus(o.id, OrderStatus.IN_PROGRESS)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-black">
                          Rouvrir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Timeline de suivi</div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {ORDER_STATUS_STEPS.map((step, index) => {
                              const isDone = currentStepIndex >= index;
                              const isCurrent = o.status === step.status || (index === 0 && [OrderStatus.REGISTERED, OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.IN_PROGRESS].includes(o.status));
                              return (
                                <div key={step.status} className={`rounded-2xl border p-4 ${o.status === OrderStatus.CANCELLED ? 'border-red-200 bg-red-50' : isCurrent ? 'border-indigo-200 bg-indigo-50' : isDone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                  <div className="font-black text-slate-900">{step.label}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-500">{step.description}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Produits achetés</div>
                          <div className="divide-y divide-slate-100">
                            {o.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                                <div>
                                  <div className="font-bold text-slate-900">{item.titleSnapshot}</div>
                                  {item.variantSnapshot && <div className="text-xs text-slate-500">{item.variantSnapshot}</div>}
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-slate-900">{(item.priceSnapshot * item.quantity).toFixed(2)} TND</div>
                                  <div className="text-xs text-slate-500">Qté {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Delivery editor</div>
                          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                            This content will become visible to the customer and will be sent by email.
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select value={deliveryDraft.orderItemId} onChange={(e) => updateDeliveryDraft({ orderItemId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                              {o.items.map((item) => <option key={item.id} value={item.id}>{item.titleSnapshot}</option>)}
                            </select>
                            <select value={deliveryDraft.deliveryType} onChange={(e) => updateDeliveryDraft({ deliveryType: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                              {['KEY', 'ACCOUNT', 'FILE', 'LINK', 'MIXED'].map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </div>
                          <textarea value={deliveryDraft.deliveryContent} onChange={(e) => updateDeliveryDraft({ deliveryContent: e.target.value })} placeholder="Key, login/password, file link, notes..." className="mt-3 min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm" />
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <input value={deliveryDraft.activationGuide} onChange={(e) => updateDeliveryDraft({ activationGuide: e.target.value })} placeholder="Activation guide" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            <input value={deliveryDraft.restrictions} onChange={(e) => updateDeliveryDraft({ restrictions: e.target.value })} placeholder="Restrictions" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            <input value={deliveryDraft.region} onChange={(e) => updateDeliveryDraft({ region: e.target.value })} placeholder="Region" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => onAdminOrderAction('createDelivery', o.id, deliveryDraft)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-black">
                              Préparer livraison chiffrée
                            </button>
                            <button type="button" onClick={() => onAdminOrderAction('sendDelivery', o.id)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700">
                              Envoyer livraison
                            </button>
                            <button type="button" onClick={() => onAdminOrderAction('resendDelivery', o.id)} className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">
                              Renvoyer livraison
                            </button>
                          </div>
                          <div className="mt-4 space-y-2">
                            {(o.deliveries || []).map((delivery) => (
                              <div key={delivery.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                                <span className="font-black text-slate-900">{delivery.deliveryType}</span> · {delivery.status} · resend {delivery.resendCount || 0}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Action logs</div>
                          <div className="space-y-2">
                            {(o.actionLogs || []).map((log) => (
                              <div key={log.id} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                                <div className="font-black text-slate-900">{log.action}</div>
                                <div>{log.actorType} {log.actorId || ''} · {new Date(log.createdAt).toLocaleString('fr-FR')}</div>
                              </div>
                            ))}
                            {(!o.actionLogs || o.actionLogs.length === 0) && <div className="text-sm italic text-slate-400">Aucun log.</div>}
                          </div>
                        </div>
                      </div>
                      <aside className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Actions administratives</div>
                          <select className={`mt-3 w-full rounded-xl px-4 py-3 text-xs font-bold uppercase border-none focus:ring-0 cursor-pointer ${getOrderStatusClasses(o.status)}`} value={o.status} onChange={(e) => requestOrderStatusChange(o.id, o.status, e.target.value as OrderStatus)}>
                            {[OrderStatus.PAYMENT_UNDER_REVIEW, OrderStatus.PAYMENT_RECEIVED, OrderStatus.PAID, OrderStatus.PAYMENT_REJECTED, OrderStatus.IN_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED].map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                          </select>
                          <button type="button" onClick={() => onAdminOrderAction('approvePayment', o.id)} className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700">
                            Approuver paiement
                          </button>
                          <button type="button" onClick={() => onRequestRejectPayment(o.id)} className="mt-3 flex w-full items-center justify-center rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-700 hover:bg-red-100">
                            Rejeter paiement
                          </button>
                          <a href={`mailto:${o.customerEmail || o.buyer?.email || ''}`} className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50">
                            Email client
                          </a>
                          <button type="button" onClick={() => onResendOrderInvoiceEmail(o.id)} className="mt-3 flex w-full items-center justify-center rounded-xl bg-indigo-50 px-4 py-3 text-xs font-black text-indigo-700 hover:bg-indigo-100">
                            Renvoyer facture
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadInvoice(o.id, `${o.invoice?.invoiceNumber || o.orderNumber}.pdf`)}
                            disabled={invoiceLoadingId === o.id}
                            className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {invoiceLoadingId === o.id ? 'Téléchargement...' : 'Télécharger la facture'}
                          </button>
                          <a
                            href={buildAdminWhatsappUrl(
                              o.customerPhone,
                              `Commande ${o.orderNumber}: bonjour, nous vous contactons au sujet de votre paiement ${paymentLabels[(o.paymentMethod || '').toLowerCase()] || o.paymentMethod || 'manuel'}.`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                          >
                            WhatsApp client
                          </a>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Audit</div>
                          <div className="mt-3">Créée: {new Date(o.createdAt).toLocaleString('fr-FR')}</div>
                          <div className="mt-1">Mise à jour: {new Date(o.updatedAt).toLocaleString('fr-FR')}</div>
                          {o.emailError && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{o.emailError}</div>}
                        </div>
                      </aside>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!ordersQuery.isLoading && orders.length === 0 && (
            <AdminEmptyState
              title="Aucune commande trouvée"
              description="Ajuste les filtres, la recherche ou la période pour retrouver une commande à traiter."
            />
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <AdminTablePagination
              page={page}
              limit={limit}
              total={totalOrders}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Paiements à vérifier</div>
            <div className="mt-4 space-y-3">
              {reviewOrders.slice(0, 5).map((order) => (
                <button key={order.id} type="button" onClick={() => setExpandedOrderId(order.id)} className="w-full rounded-xl border border-amber-100 bg-amber-50 p-3 text-left hover:border-amber-200 hover:bg-amber-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-black text-amber-800">{order.orderNumber}</div>
                    <div className="text-xs font-bold text-slate-500">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900">{order.buyerDisplayName || order.customerEmail || 'Client'}</div>
                  <div className="text-xs text-slate-600">{order.amount.toFixed(2)} TND</div>
                </button>
              ))}
              {reviewOrders.length === 0 && <div className="text-sm text-slate-400">Aucun paiement en attente de vérification.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Priorités</div>
            <div className="mt-4 space-y-3">
              {activeOrders.slice(0, 5).map((order) => (
                <button key={order.id} type="button" onClick={() => setExpandedOrderId(order.id)} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50">
                  <div className="text-xs font-black text-indigo-700">{order.orderNumber}</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900">{order.buyerDisplayName || order.customerEmail || 'Client'}</div>
                  <div className="text-xs text-slate-500">{order.amount.toFixed(2)} TND</div>
                </button>
              ))}
              {activeOrders.length === 0 && <div className="text-sm text-slate-400">Aucune commande active.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Santé opérationnelle</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Taux livraison</span><span className="font-black text-slate-900">{orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Panier moyen</span><span className="font-black text-slate-900">{orders.length ? (revenue / orders.length).toFixed(2) : '0.00'} TND</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Emails échoués</span><span className="font-black text-slate-900">{orders.filter((order) => order.emailStatus === 'FAILED').length}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrdersSection;
