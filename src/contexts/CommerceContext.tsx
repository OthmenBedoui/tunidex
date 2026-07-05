/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { handleApiError } from '../../utils/apiError';
import { Category, Listing, Order, OrderStatus, SiteConfig } from '../../types';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useCategories } from '../hooks/useCategories';
import { useMyOrders } from '../hooks/useMyOrders';
import { useProducts } from '../hooks/useProducts';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useAdminOrdersPage } from '../hooks/useAdminOrdersPage';
import { queryKeys } from '../queryKeys';

const DEFAULT_SITE_CONFIG: SiteConfig = {
  logoUrl: '',
  siteName: 'TuniBots',
  logoSize: 32,
  heroPromoBanners: [],
  floatingBrandCards: [],
  storeSections: []
};

type RejectOrderPayload = {
  reason?: string;
};

type CreateDeliveryPayload = {
  orderItemId?: string;
  deliveryType: string;
  deliveryContent: string;
  activationGuide?: string;
  restrictions?: string;
  region?: string;
};

const getVisitorId = () => {
  const storageKey = 'tunibots_visitor_id';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(storageKey, next);
  return next;
};

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
};

const ensureScript = (id: string, src: string) => {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const ensureInlineScript = (id: string, content: string) => {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.text = content;
  document.head.appendChild(script);
};

const getDefaultFontFamily = () =>
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const getFontFormat = (format: string) => {
  if (format === 'ttf') return 'truetype';
  if (format === 'otf') return 'opentype';
  return format || 'woff2';
};

type CommerceContextValue = {
  listings: Listing[];
  publicListings: Listing[];
  categories: Category[];
  orders: Order[];
  siteConfig: SiteConfig;
  isCatalogResolved: boolean;
  pendingOrdersCount: number;
  refreshData: () => void;
  onOrderCreated: (order: Order) => void;
  createListing: (listing: Partial<Listing>) => Promise<void>;
  updateListing: (listingId: string, listing: Partial<Listing>) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  resendOrderInvoiceEmail: (orderId: string) => Promise<void>;
  adminOrderAction: (
    action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery',
    orderId: string,
    payload?: unknown
  ) => Promise<void>;
  updateSiteConfig: (config: Partial<SiteConfig>) => Promise<void>;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

export const CommerceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthResolved } = useAuth();
  const { showNotification } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isStaff = user.role === 'ADMIN' || user.role === 'AGENT';
  const siteConfigQuery = useSiteConfig();
  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const myOrdersQuery = useMyOrders(isAuthResolved && user.id !== 'guest' && !isStaff);
  const pendingAdminOrdersQuery = useAdminOrdersPage(
    { status: OrderStatus.PAYMENT_UNDER_REVIEW, limit: 1, sort: 'newest' },
    {
      enabled: isAuthResolved && isStaff,
      refetchInterval: isAuthResolved && isStaff
        ? Math.max(5, Number(siteConfigQuery.data?.adminNotificationPollSeconds || 15)) * 1000
        : false
    }
  );

  const listings = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const orders = useMemo(() => (!isStaff ? myOrdersQuery.data ?? [] : []), [isStaff, myOrdersQuery.data]);
  const siteConfig = siteConfigQuery.data || DEFAULT_SITE_CONFIG;
  const isCatalogResolved = productsQuery.isSuccess && categoriesQuery.isSuccess && siteConfigQuery.isSuccess;

  const publicListings = useMemo(() => listings.filter((listing) => !listing.isArchived), [listings]);
  const pendingOrdersCount = isStaff
    ? pendingAdminOrdersQuery.data?.total || 0
    : orders.filter((order) => order.status === OrderStatus.PAYMENT_UNDER_REVIEW).length;

  const refreshData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.products });
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
  }, [queryClient]);

  useEffect(() => {
    if (productsQuery.error) {
      handleApiError({
        error: productsQuery.error,
        fallbackMessage: 'Impossible de charger les produits.',
        logContext: 'Unable to load listings during app bootstrap'
      });
    }
  }, [productsQuery.error]);

  useEffect(() => {
    if (categoriesQuery.error) {
      handleApiError({
        error: categoriesQuery.error,
        fallbackMessage: 'Impossible de charger les catégories.',
        logContext: 'Unable to load categories during app bootstrap'
      });
    }
  }, [categoriesQuery.error]);

  useEffect(() => {
    if (siteConfigQuery.error) {
      handleApiError({
        error: siteConfigQuery.error,
        fallbackMessage: 'Impossible de charger la configuration du site.',
        logContext: 'Unable to load site config during app bootstrap'
      });
    }
  }, [siteConfigQuery.error]);

  useEffect(() => {
    if (myOrdersQuery.error) {
      handleApiError({
        error: myOrdersQuery.error,
        fallbackMessage: 'Impossible de charger les commandes client.',
        logContext: 'Unable to load client orders'
      });
    }
  }, [myOrdersQuery.error]);

  useEffect(() => {
    if (pendingAdminOrdersQuery.error) {
      handleApiError({
        error: pendingAdminOrdersQuery.error,
        fallbackMessage: 'Impossible de rafraîchir les commandes admin.',
        logContext: 'Unable to load admin orders'
      });
    }
  }, [pendingAdminOrdersQuery.error]);

  useEffect(() => {
    const title = siteConfig.seoTitle || siteConfig.siteName || 'TuniBots';
    const description = siteConfig.seoDescription || siteConfig.footerDescription || '';
    document.title = title;

    if (siteConfig.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = siteConfig.faviconUrl;
    }

    const root = document.documentElement;
    root.style.setProperty('--theme-accent', siteConfig.accentColor || '#4f46e5');
    root.style.setProperty('--theme-accent-hover', siteConfig.accentHoverColor || '#4338ca');
    root.style.setProperty('--theme-accent-soft', siteConfig.accentSoftColor || '#e0e7ff');
    root.style.setProperty('--theme-accent-text', siteConfig.accentTextColor || '#312e81');
    root.style.setProperty('--font-site', siteConfig.fontFamily || getDefaultFontFamily());

    const styleId = 'tunibots-custom-fonts';
    let fontStyle = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!fontStyle) {
      fontStyle = document.createElement('style');
      fontStyle.id = styleId;
      document.head.appendChild(fontStyle);
    }
    fontStyle.textContent = (siteConfig.customFonts || [])
      .map((font) => `@font-face{font-family:"${font.family}";src:url("${font.dataUrl}") format("${getFontFormat(font.format)}");font-display:swap;}`)
      .join('\n');

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: siteConfig.seoKeywords || '' });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: siteConfig.seoRobots || 'index,follow' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    if (siteConfig.seoOgImageUrl) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: siteConfig.seoOgImageUrl });
    if (siteConfig.seoCanonicalUrl) {
      let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = siteConfig.seoCanonicalUrl;
    }
    const gtagId = siteConfig.seoGoogleAnalyticsId || siteConfig.seoGoogleAdsConversionId;
    if (gtagId) {
      ensureScript('tunibots-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`);
      ensureInlineScript('tunibots-gtag-init', `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${siteConfig.seoGoogleAnalyticsId ? `gtag('config','${siteConfig.seoGoogleAnalyticsId}');` : ''}${siteConfig.seoGoogleAdsConversionId ? `gtag('config','${siteConfig.seoGoogleAdsConversionId}');` : ''}`);
    }
    if (siteConfig.seoFacebookPixelId) {
      ensureInlineScript('tunibots-meta-pixel', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${siteConfig.seoFacebookPixelId}');fbq('track','PageView');`);
    }
  }, [siteConfig]);

  useEffect(() => {
    const category = location.pathname.startsWith('/category/')
      ? categories.find((item) => location.pathname.endsWith(`/${encodeURIComponent(item.slug)}`) || location.pathname.endsWith(`/${item.slug}`))
      : null;
    const product = location.pathname.startsWith('/product/')
      ? publicListings.find((listing) => location.pathname.endsWith(`/${encodeURIComponent(listing.slug)}`) || location.pathname.endsWith(`/${listing.slug}`))
      : null;

    api.trackVisit({
      path: location.pathname,
      pageType: product ? 'product' : category ? 'category' : location.pathname,
      listingId: product?.id,
      categoryId: category?.id,
      userId: user.id,
      visitorId: getVisitorId(),
      referrer: document.referrer
    }).catch((error) => {
      handleApiError({
        error,
        fallbackMessage: 'Le suivi de visite a échoué.',
        logContext: 'Unable to track visit'
      });
    });
  }, [categories, location.pathname, publicListings, user.id]);

  const orderListKey = isStaff ? queryKeys.orders.admin : queryKeys.orders.my;

  const onOrderCreated = useCallback((order: Order) => {
    queryClient.setQueryData<Order[]>(queryKeys.orders.my, (current = []) => {
      const exists = current.some((entry) => entry.id === order.id);
      return exists
        ? current.map((entry) => entry.id === order.id ? { ...entry, ...order } : entry)
        : [order, ...current];
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.admin });
  }, [queryClient]);

  const createListingMutation = useMutation({
    mutationFn: (listing: Partial<Listing>) => api.createListing(listing),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      ]);
      showNotification('Produit créé avec succès !');
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: ({ listingId, listing }: { listingId: string; listing: Partial<Listing> }) => api.updateListing(listingId, listing),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      ]);
      showNotification('Produit mis à jour avec succès !');
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => api.deleteListing(listingId),
    onSuccess: async (result) => {
      if (location.pathname.startsWith('/product/')) {
        navigate('/', { replace: true });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      ]);
      showNotification(result.archived ? (result.message || 'Produit archivé avec succès !') : 'Produit supprimé avec succès !');
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => api.updateOrderStatus(orderId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderListKey });
      showNotification('Statut de la commande mis à jour');
    }
  });

  const resendOrderInvoiceEmailMutation = useMutation({
    mutationFn: (orderId: string) => api.resendOrderInvoiceEmail(orderId),
    onSuccess: async (updatedOrder) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.admin });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.my });
      if (updatedOrder.emailStatus === 'FAILED') {
        showNotification(updatedOrder.emailError || "L'email de facture n'a pas pu être envoyé", 'error');
        return;
      }
      showNotification('Email de facture renvoyé');
    }
  });

  const adminOrderActionMutation = useMutation({
    mutationFn: async ({ action, orderId, payload }: { action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery'; orderId: string; payload?: unknown }) => {
      const rejectPayload = (payload && typeof payload === 'object' ? payload as RejectOrderPayload : undefined);
      const deliveryPayload = (payload && typeof payload === 'object' ? payload as Partial<CreateDeliveryPayload> : undefined);

      return (
        action === 'approvePayment' ? api.approveOrderPayment(orderId) :
        action === 'rejectPayment' ? api.rejectOrderPayment(orderId, rejectPayload?.reason || 'Paiement rejeté.') :
        action === 'createDelivery' ? api.createOrderDelivery(orderId, {
          deliveryType: deliveryPayload?.deliveryType || 'manual',
          deliveryContent: deliveryPayload?.deliveryContent || '',
          orderItemId: deliveryPayload?.orderItemId,
          activationGuide: deliveryPayload?.activationGuide,
          restrictions: deliveryPayload?.restrictions,
          region: deliveryPayload?.region
        }) :
        action === 'sendDelivery' ? api.sendOrderDelivery(orderId) :
        api.resendOrderDeliveryEmail(orderId)
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.admin }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.my }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      ]);
      showNotification('Commande mise à jour');
    }
  });

  const updateSiteConfigMutation = useMutation({
    mutationFn: (config: Partial<SiteConfig>) => api.updateSiteConfig(config),
    onSuccess: (nextConfig) => {
      queryClient.setQueryData(queryKeys.siteConfig, nextConfig);
      showNotification('Configuration du site mise à jour');
    }
  });

  const createListing = useCallback(async (listing: Partial<Listing>) => {
    try {
      await createListingMutation.mutateAsync(listing);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Erreur lors de la création du produit.',
        notify: showNotification,
        logContext: 'Unable to create listing'
      });
      throw error;
    }
  }, [createListingMutation, showNotification]);

  const updateListing = useCallback(async (listingId: string, listing: Partial<Listing>) => {
    try {
      await updateListingMutation.mutateAsync({ listingId, listing });
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Erreur lors de la mise à jour du produit.',
        notify: showNotification,
        logContext: `Unable to update listing ${listingId}`
      });
      throw error;
    }
  }, [showNotification, updateListingMutation]);

  const deleteListing = useCallback(async (listingId: string) => {
    try {
      await deleteListingMutation.mutateAsync(listingId);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Erreur lors de la suppression du produit.',
        notify: showNotification,
        logContext: `Unable to delete listing ${listingId}`
      });
      throw error;
    }
  }, [deleteListingMutation, showNotification]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatusMutation.mutateAsync({ orderId, status });
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Erreur lors de la mise à jour',
        notify: showNotification,
        logContext: `Unable to update order status ${orderId}`
      });
    }
  }, [showNotification, updateOrderStatusMutation]);

  const resendOrderInvoiceEmail = useCallback(async (orderId: string) => {
    try {
      await resendOrderInvoiceEmailMutation.mutateAsync(orderId);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: "Erreur d'envoi email",
        notify: showNotification,
        logContext: `Unable to resend invoice email for order ${orderId}`
      });
    }
  }, [resendOrderInvoiceEmailMutation, showNotification]);

  const adminOrderAction = useCallback(async (
    action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery',
    orderId: string,
    payload?: unknown
  ) => {
    try {
      await adminOrderActionMutation.mutateAsync({ action, orderId, payload });
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Action admin impossible',
        notify: showNotification,
        logContext: `Admin order action ${action} failed for order ${orderId}`
      });
      throw error;
    }
  }, [adminOrderActionMutation, showNotification]);

  const updateSiteConfig = useCallback(async (config: Partial<SiteConfig>) => {
    try {
      await updateSiteConfigMutation.mutateAsync(config);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Erreur lors de la mise à jour',
        notify: showNotification,
        logContext: 'Unable to update site config'
      });
      throw error;
    }
  }, [showNotification, updateSiteConfigMutation]);

  const value = useMemo(() => ({
    listings,
    publicListings,
    categories,
    orders,
    siteConfig,
    isCatalogResolved,
    pendingOrdersCount,
    refreshData,
    onOrderCreated,
    createListing,
    updateListing,
    deleteListing,
    updateOrderStatus,
    resendOrderInvoiceEmail,
    adminOrderAction,
    updateSiteConfig
  }), [
    adminOrderAction,
    categories,
    createListing,
    deleteListing,
    isCatalogResolved,
    listings,
    onOrderCreated,
    orders,
    pendingOrdersCount,
    publicListings,
    refreshData,
    resendOrderInvoiceEmail,
    siteConfig,
    updateListing,
    updateOrderStatus,
    updateSiteConfig
  ]);

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
};

export const useCommerce = () => {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error('useCommerce must be used within CommerceProvider');
  }
  return context;
};
