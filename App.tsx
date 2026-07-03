
import React, { useRef, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import AdminLayout from './components/admin/AdminLayout';
import StoreLayout from './components/store-client/shell/StoreLayout';
import StoreBootLoader from './components/store-client/StoreBootLoader';
import { About, AuthCallback, Cart, CategoryPage, Contact, DataDeletion, Home, Login, OrderTracking, PrivacyPolicy, ProductPage, Profile, Subscription, Terms } from './pages/store';
import RegisterAuthenticationAdmin from './pages/RegisterAuthenticationAdmin';
import { UserDashboard } from './pages/Dashboards';
import { User, UserRole, Listing, Order, OrderStatus, SubscriptionTier, Category, SiteConfig, ClientNotification } from './types';
import { api } from './services/api';
import * as LucideIcons from 'lucide-react';
import { addGuestCartItem, getGuestCartCount } from './utils/guestCart';
import { ADMIN_TAB_SLUGS, AdminConsolePage, AdminNotFoundPage, AdminTab, canAccessAdminTab, getAdminTabFromSlug, isStaffAdminRole } from './pages/admin';

const INITIAL_GUEST: User = { id: 'guest', username: 'Invité', email: '', role: UserRole.GUEST, balance: 0, avatarUrl: 'https://via.placeholder.com/150', subscriptionTier: SubscriptionTier.FREE };

type NotificationState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

type PendingNavigation = {
  page: string;
  slug?: string;
} | null;

const findListingFromLegacySearch = (listings: Listing[], search: string) => {
  const productId = new URLSearchParams(search).get('item');
  if (!productId) return null;
  return listings.find((listing) => listing.id === productId) || null;
};

export type AdminNotificationItem = {
  id: string;
  type: 'order' | 'user' | 'account' | 'subscription' | 'system';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  userId?: string;
  userEmail?: string;
  targetTab?: 'overview' | 'orders' | 'users' | 'notification-config' | 'settings';
  createdAt: string;
  read: boolean;
};

const isAdminRole = (role: UserRole) => isStaffAdminRole(role);

const getNormalizedAdminSlug = (slug?: string) => {
  const tab = getAdminTabFromSlug(slug);
  return tab ? (slug || '') : '';
};

const resolveRouteFromPath = (pathname: string): { page: string; slug?: string } => {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (normalizedPath === '/') {
    return { page: 'home' };
  }
  if (normalizedPath === '/admin') {
    return { page: 'admin-dashboard', slug: '' };
  }
  if (normalizedPath === '/admin/login') {
    return { page: 'admin-login' };
  }
  if (normalizedPath === '/admin/register-authentication') {
    return { page: 'admin-register-authentication' };
  }
  if (normalizedPath.startsWith('/admin/')) {
    const adminSlug = decodeURIComponent(normalizedPath.replace('/admin/', ''));
    if (getAdminTabFromSlug(adminSlug)) {
      return { page: 'admin-dashboard', slug: adminSlug };
    }
    return { page: 'admin-not-found' };
  }
  if (normalizedPath === '/login') {
    return { page: 'login' };
  }
  if (normalizedPath === '/register') {
    return { page: 'register' };
  }
  if (normalizedPath === '/cart') {
    return { page: 'cart' };
  }
  if (normalizedPath === '/order-track') {
    return { page: 'order-track' };
  }
  if (normalizedPath === '/subscription') {
    return { page: 'subscription' };
  }
  if (normalizedPath === '/about') {
    return { page: 'about' };
  }
  if (normalizedPath === '/contact') {
    return { page: 'contact' };
  }
  if (normalizedPath === '/privacy-policy') {
    return { page: 'privacy-policy' };
  }
  if (normalizedPath === '/data-deletion') {
    return { page: 'data-deletion' };
  }
  if (normalizedPath === '/terms') {
    return { page: 'terms' };
  }
  if (normalizedPath === '/profile') {
    return { page: 'profile' };
  }
  if (normalizedPath === '/auth/callback') {
    return { page: 'auth-callback' };
  }
  if (normalizedPath === '/dashboard') {
    return { page: 'user-dashboard' };
  }
  if (normalizedPath.startsWith('/category/')) {
    return { page: 'category', slug: decodeURIComponent(normalizedPath.replace('/category/', '')) };
  }
  if (normalizedPath.startsWith('/product/')) {
    return { page: 'product', slug: decodeURIComponent(normalizedPath.replace('/product/', '')) };
  }
  if (normalizedPath === '/product') {
    return { page: 'product' };
  }
  if (normalizedPath.startsWith('/admin')) {
    return { page: 'admin-not-found' };
  }
  return { page: 'not-found' };
};

const getPathForPage = (page: string, slug?: string) => {
  switch (page) {
    case 'admin-dashboard':
      return slug ? `/admin/${slug.split('/').map((part) => encodeURIComponent(part)).join('/')}` : '/admin';
    case 'admin-login':
      return '/admin/login';
    case 'admin-register-authentication':
      return '/admin/register-authentication';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'cart':
      return '/cart';
    case 'order-track':
      return '/order-track';
    case 'subscription':
      return '/subscription';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'privacy-policy':
      return '/privacy-policy';
    case 'data-deletion':
      return '/data-deletion';
    case 'terms':
      return '/terms';
    case 'profile':
      return '/profile';
    case 'auth-callback':
      return '/auth/callback';
    case 'user-dashboard':
      return '/dashboard';
    case 'category':
      return slug ? `/category/${encodeURIComponent(slug)}` : '/';
    case 'product':
      return slug ? `/product/${encodeURIComponent(slug)}` : '/product';
    case 'admin-not-found':
    case 'not-found':
      return window.location.pathname;
    case 'home':
    default:
      return '/';
  }
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

const RouteLoadingScreen: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
    <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
      Chargement
    </div>
    <h1 className="mt-4 text-3xl font-black text-slate-950">{title}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
  </div>
);

const STAFF_ROLES = new Set(['ADMIN', 'SUB_ADMIN', 'SELLER', 'AGENT']);

const isStaffAccount = (role?: string) => STAFF_ROLES.has(role || '');

const formatUserLabel = (target: Pick<User, 'username' | 'email' | 'fullName'>) =>
  target.fullName?.trim() || target.username || target.email;

const App: React.FC = () => {
  const hasStoredToken = Boolean(localStorage.getItem('token'));
  const initialRoute = resolveRouteFromPath(window.location.pathname);
  const [user, setUser] = useState<User>(INITIAL_GUEST);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [currentSlug, setCurrentSlug] = useState(initialRoute.slug || '');
  const [selectedProduct, setSelectedProduct] = useState<Listing | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  
  const [cartCount, setCartCount] = useState(0);
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef<number | null>(null);
  const adminOrdersInitializedRef = useRef(false);
  const previousAdminOrdersRef = useRef<Map<string, Order>>(new Map());
  const adminUsersInitializedRef = useRef(false);
  const previousAdminUsersRef = useRef<Map<string, User>>(new Map());
  const clientNotificationsInitializedRef = useRef(false);
  const previousClientNotificationsRef = useRef<Map<string, ClientNotification>>(new Map());
  const [adminNotifications, setAdminNotifications] = useState<AdminNotificationItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tunibots_admin_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [isAdminNotificationCenterOpen, setIsAdminNotificationCenterOpen] = useState(false);
  const [blockingOrderNotification, setBlockingOrderNotification] = useState<AdminNotificationItem | null>(null);
  const [clientNotifications, setClientNotifications] = useState<ClientNotification[]>([]);
  const [adminFocusOrderId, setAdminFocusOrderId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ logoUrl: '', siteName: 'TuniBots', logoSize: 32, heroPromoBanners: [], floatingBrandCards: [], storeSections: [] });
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(!localStorage.getItem('token'));
  const [isCatalogResolved, setIsCatalogResolved] = useState(false);
  const publicListings = useMemo(() => listings.filter((listing) => !listing.isArchived), [listings]);
  const currentAdminTab = useMemo(
    () => getAdminTabFromSlug(currentSlug) || 'overview',
    [currentSlug]
  );
  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => order.status === OrderStatus.PAYMENT_UNDER_REVIEW).length,
    [orders]
  );
  const isAdminSurface =
    currentPage === 'admin-dashboard' ||
    currentPage === 'admin-login' ||
    currentPage === 'admin-register-authentication' ||
    currentPage === 'admin-not-found';
  const shouldShowStoreLoader =
    !isAdminSurface &&
    (!isCatalogResolved || (hasStoredToken && !isAuthResolved));

  useEffect(() => {
    const handlePopState = () => {
      const route = resolveRouteFromPath(window.location.pathname);
      setCurrentPage(route.page);
      setCurrentSlug(route.slug || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');

    const bootstrap = async () => {
      if (token) {
        try {
          const currentUser = await api.getCurrentUser();
          if (isMounted) {
            setUser(currentUser);
          }
        } catch (error) {
          console.warn('Unable to restore current user session.', error);
          localStorage.removeItem('token');
          if (isMounted) {
            setUser(INITIAL_GUEST);
          }
        } finally {
          if (isMounted) {
            setIsAuthResolved(true);
          }
        }
      } else if (isMounted) {
        setIsAuthResolved(true);
      }

      const [listingResult, categoryResult, siteConfigResult] = await Promise.allSettled([
        api.getListings(),
        api.getCategories(),
        api.getSiteConfig()
      ]);

      if (!isMounted) {
        return;
      }

      if (listingResult.status === 'fulfilled') {
        setListings(listingResult.value);
      } else {
        console.warn('Unable to load listings during app bootstrap.', listingResult.reason);
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value);
      } else {
        console.warn('Unable to load categories during app bootstrap.', categoryResult.reason);
      }

      if (siteConfigResult.status === 'fulfilled') {
        setSiteConfig(siteConfigResult.value);
      } else {
        console.warn('Unable to load site config during app bootstrap.', siteConfigResult.reason);
      }

      setIsCatalogResolved(true);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');

    const syncCart = async () => {
      if (!token) {
        if (isMounted) {
          setCartCount(getGuestCartCount());
        }
        return;
      }

      try {
        const items = await api.getCart();
        if (isMounted) {
          setCartCount(items.reduce((acc, item) => acc + item.quantity, 0));
        }
      } catch (error) {
        console.warn('Unable to sync cart count.', error);
      }
    };

    void syncCart();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    let isMounted = true;

    const syncOrders = async () => {
      if (!isAuthResolved) return;
      if (user.id === 'guest' || isAdminRole(user.role)) return;

      try {
        const latestOrders = await api.getMyOrders();
        if (isMounted) {
          setOrders(latestOrders);
        }
      } catch (error) {
        console.warn('Unable to load client orders during bootstrap.', error);
      }
    };

    void syncOrders();

    return () => {
      isMounted = false;
    };
  }, [isAuthResolved, user.id, user.role]);

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
    if (isAdminSurface) return;
    const pageType = selectedProduct && currentPage === 'product'
      ? 'product'
      : currentPage === 'category'
        ? 'category'
        : currentPage;
    const category = currentPage === 'category' ? categories.find((item) => item.slug === currentSlug) : null;

    api.trackVisit({
      path: window.location.pathname,
      pageType,
      listingId: selectedProduct?.id,
      categoryId: category?.id,
      userId: user.id,
      visitorId: getVisitorId(),
      referrer: document.referrer
    }).catch(() => {});
  }, [currentPage, currentSlug, selectedProduct?.id, categories, user.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const freshSelectedProduct = listings.find((listing) => listing.id === selectedProduct.id);
    if (freshSelectedProduct) {
      setSelectedProduct(freshSelectedProduct);
      if (freshSelectedProduct.variants?.length && !freshSelectedProduct.variants.some((variant) => variant.id === selectedVariantId)) {
        setSelectedVariantId(freshSelectedProduct.variants[0].id || '');
      }
    }
  }, [listings, selectedProduct, selectedVariantId]);

  useEffect(() => {
    if (currentPage !== 'product') return;

    if (currentSlug) {
      const matchedListing = listings.find((listing) => listing.slug === currentSlug && !listing.isArchived) || null;
      setSelectedProduct(matchedListing);
      setSelectedVariantId((currentVariantId) => {
        if (!matchedListing?.variants?.length) return '';
        if (matchedListing.variants.some((variant) => variant.id === currentVariantId)) return currentVariantId;
        return matchedListing.variants[0].id || '';
      });
      return;
    }

    const legacyListing = findListingFromLegacySearch(listings, window.location.search);
    if (legacyListing && !legacyListing.isArchived) {
      setSelectedProduct(legacyListing);
      setSelectedVariantId(legacyListing.variants?.[0]?.id || '');
      setCurrentSlug(legacyListing.slug);
      window.history.replaceState({}, '', getPathForPage('product', legacyListing.slug));
      window.scrollTo(0, 0);
      return;
    }

    if (window.location.pathname === '/product') {
      setSelectedProduct(null);
      setSelectedVariantId('');
    }
  }, [currentPage, currentSlug, listings]);

  const refreshData = () => {
      api.getListings().then(setListings).catch(console.error);
      api.getCategories().then(setCategories).catch(console.error);
  };

  useEffect(() => {
    localStorage.setItem('tunibots_admin_notifications', JSON.stringify(adminNotifications.slice(0, 80)));
  }, [adminNotifications]);

  const pushAdminNotification = (item: AdminNotificationItem, options?: { blocking?: boolean; toastMessage?: string }) => {
    setAdminNotifications((current) => [item, ...current].slice(0, 80));
    setIsAdminNotificationCenterOpen(false);
    if (options?.blocking) {
      setBlockingOrderNotification(item);
    }
    if (options?.toastMessage) {
      showNotification(options.toastMessage);
    }
  };

  const playAdminOrderSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.38);
    } catch {
      // Browser may block audio before user interaction.
    }
  };

  useEffect(() => {
    if (!blockingOrderNotification || siteConfig.adminNotificationSound === false) return;
    playAdminOrderSound();
    const interval = window.setInterval(playAdminOrderSound, 2600);
    return () => window.clearInterval(interval);
  }, [blockingOrderNotification, siteConfig.adminNotificationSound]);

  const pushAdminOrderNotification = (order: Order) => {
    pushAdminNotification({
      id: `order-${order.id}-${Date.now()}`,
      type: 'order',
      title: 'Nouvelle commande',
      message: `${order.orderNumber} - ${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      targetTab: 'orders',
      createdAt: new Date().toISOString(),
      read: false
    }, {
      blocking: true,
      toastMessage: `Nouvelle commande à traiter: ${order.orderNumber}`
    });
  };

  const markAdminNotificationRead = (notificationId: string) => {
    setAdminNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  };

  const markAllAdminNotificationsRead = () => {
    setAdminNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const openAdminTab = (tab: AdminTab) => {
    setAdminFocusOrderId(null);
    navigateTo('admin-dashboard', ADMIN_TAB_SLUGS[tab]);
  };

  const openAdminNotificationOrder = (item: AdminNotificationItem) => {
    markAdminNotificationRead(item.id);
    setBlockingOrderNotification(null);
    setIsAdminNotificationCenterOpen(false);
    if (item.orderId) {
      setAdminFocusOrderId(item.orderId);
      openAdminTab('orders');
    } else if (item.targetTab) {
      openAdminTab(item.targetTab);
    }
    if (item.orderNumber) {
      showNotification(`Commande ${item.orderNumber} ouverte dans le dashboard`);
      return;
    }
    if (item.targetTab === 'users') {
      showNotification('Centre utilisateurs ouvert dans le dashboard');
      return;
    }
    if (item.targetTab === 'settings') {
      showNotification('Paramètres clients ouverts dans le dashboard');
      return;
    }
    showNotification('Notification ouverte dans le dashboard');
  };

  useEffect(() => {
    if (!isAdminRole(user.role)) {
      adminOrdersInitializedRef.current = false;
      previousAdminOrdersRef.current = new Map();
      return;
    }

    const pollSeconds = Math.max(5, Number(siteConfig.adminNotificationPollSeconds || 15));
    const pollOrders = async () => {
      try {
        const latestOrders = await api.getAllOrders();
        const previousOrders = previousAdminOrdersRef.current;
        const latestMap = new Map(latestOrders.map((order) => [order.id, order]));
        const newOrders = latestOrders.filter((order) => !previousOrders.has(order.id));
        const changedOrders = latestOrders.filter((order) => {
          const previous = previousOrders.get(order.id);
          return previous && previous.status !== order.status;
        });

        if (adminOrdersInitializedRef.current && siteConfig.adminNotificationsEnabled !== false && newOrders.length > 0) {
          pushAdminOrderNotification(newOrders[0]);
          if (siteConfig.adminNotificationSound !== false) playAdminOrderSound();
        }

        if (adminOrdersInitializedRef.current && siteConfig.adminNotificationsEnabled !== false) {
          changedOrders.forEach((order) => {
            const previous = previousOrders.get(order.id);
            if (!previous) return;

            const baseItem: AdminNotificationItem = {
              id: `order-status-${order.id}-${order.status}-${Date.now()}`,
              type: 'order',
              title: 'Commande mise à jour',
              message: `${order.orderNumber} est passée de ${previous.status} à ${order.status}.`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              targetTab: 'orders',
              createdAt: new Date().toISOString(),
              read: false
            };

            if (order.status === OrderStatus.CANCELLED) {
              pushAdminNotification({
                ...baseItem,
                title: 'Commande annulée',
                message: `${order.orderNumber} a été annulée et doit être revue par l'admin.`
              }, { toastMessage: `Commande annulée: ${order.orderNumber}` });
              return;
            }

            if (order.status === OrderStatus.PAYMENT_RECEIVED) {
              pushAdminNotification({
                ...baseItem,
                title: 'Paiement reçu',
                message: `${order.orderNumber} est marquée comme paiement reçu et attend un suivi admin.`
              });
              return;
            }

            if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) {
              pushAdminNotification({
                ...baseItem,
                title: 'Commande finalisée',
                message: `${order.orderNumber} a été finalisée avec le statut ${order.status}.`
              });
            }
          });
        }

        adminOrdersInitializedRef.current = true;
        previousAdminOrdersRef.current = latestMap;
        setOrders(latestOrders);
      } catch (error) {
        console.error(error);
      }
    };

    pollOrders();
    const interval = window.setInterval(pollOrders, pollSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [
    user.role,
    siteConfig.adminNotificationsEnabled,
    siteConfig.adminNotificationSound,
    siteConfig.adminNotificationPollSeconds
  ]);

  useEffect(() => {
    if (user.role !== UserRole.ADMIN) {
      adminUsersInitializedRef.current = false;
      previousAdminUsersRef.current = new Map();
      return;
    }

    const pollSeconds = Math.max(5, Number(siteConfig.adminNotificationPollSeconds || 15));
    const pollUsers = async () => {
      try {
        const latestUsers = await api.getAllUsers();
        const previousUsers = previousAdminUsersRef.current;
        const latestMap = new Map(latestUsers.map((account) => [account.id, account]));

        if (adminUsersInitializedRef.current && siteConfig.adminNotificationsEnabled !== false) {
          latestUsers
            .filter((account) => !previousUsers.has(account.id) && !isStaffAccount(account.role))
            .forEach((account) => {
              pushAdminNotification({
                id: `user-created-${account.id}-${Date.now()}`,
                type: 'user',
                title: 'Nouvel utilisateur créé',
                message: `${formatUserLabel(account)} vient de créer un compte (${account.email}).`,
                userId: account.id,
                userEmail: account.email,
                targetTab: 'users',
                createdAt: new Date().toISOString(),
                read: false
              }, { toastMessage: `Nouvel utilisateur: ${account.username}` });
            });

          Array.from(previousUsers.values())
            .filter((account) => !latestMap.has(account.id) && !isStaffAccount(account.role))
            .forEach((account) => {
              pushAdminNotification({
                id: `user-deleted-${account.id}-${Date.now()}`,
                type: 'account',
                title: 'Compte supprimé',
                message: `${formatUserLabel(account)} a supprimé son compte client.`,
                userId: account.id,
                userEmail: account.email,
                targetTab: 'users',
                createdAt: new Date().toISOString(),
                read: false
              }, { toastMessage: `Compte supprimé: ${account.username}` });
            });

          latestUsers.forEach((account) => {
            const previous = previousUsers.get(account.id);
            if (!previous || isStaffAccount(account.role)) return;

            if (!previous.emailVerified && account.emailVerified) {
              pushAdminNotification({
                id: `user-verified-${account.id}-${Date.now()}`,
                type: 'user',
                title: 'Compte vérifié',
                message: `${formatUserLabel(account)} a confirmé son compte.`,
                userId: account.id,
                userEmail: account.email,
                targetTab: 'users',
                createdAt: new Date().toISOString(),
                read: false
              });
            }

            if (previous.email !== account.email) {
              pushAdminNotification({
                id: `user-email-${account.id}-${Date.now()}`,
                type: 'account',
                title: 'Email client modifié',
                message: `${formatUserLabel(account)} a changé son email en ${account.email}.`,
                userId: account.id,
                userEmail: account.email,
                targetTab: 'users',
                createdAt: new Date().toISOString(),
                read: false
              });
            }

            if (previous.subscriptionTier !== account.subscriptionTier) {
              pushAdminNotification({
                id: `user-subscription-${account.id}-${Date.now()}`,
                type: 'subscription',
                title: 'Abonnement mis à jour',
                message: `${formatUserLabel(account)} est passé de ${previous.subscriptionTier} à ${account.subscriptionTier}.`,
                userId: account.id,
                userEmail: account.email,
                targetTab: 'users',
                createdAt: new Date().toISOString(),
                read: false
              });
            }
          });
        }

        adminUsersInitializedRef.current = true;
        previousAdminUsersRef.current = latestMap;
      } catch (error) {
        console.error(error);
      }
    };

    pollUsers();
    const interval = window.setInterval(pollUsers, pollSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [
    user.role,
    siteConfig.adminNotificationsEnabled,
    siteConfig.adminNotificationPollSeconds
  ]);

  useEffect(() => {
    if (user.id === 'guest' || isAdminRole(user.role)) {
      clientNotificationsInitializedRef.current = false;
      previousClientNotificationsRef.current = new Map();
      setClientNotifications([]);
      return;
    }

    const pollNotifications = async () => {
      try {
        const latestNotifications = await api.getMyNotifications();
        const previousNotifications = previousClientNotificationsRef.current;
        const latestMap = new Map(latestNotifications.map((notification) => [notification.id, notification]));

        if (clientNotificationsInitializedRef.current) {
          const unreadIncoming = latestNotifications.filter((notification) => {
            const previous = previousNotifications.get(notification.id);
            return !notification.read && (!previous || previous.read);
          });

          if (unreadIncoming.length > 0) {
            showNotification(unreadIncoming[0].title);
          }
        }

        clientNotificationsInitializedRef.current = true;
        previousClientNotificationsRef.current = latestMap;
        setClientNotifications(latestNotifications);
      } catch (error) {
        console.error(error);
      }
    };

    pollNotifications();
    const interval = window.setInterval(pollNotifications, 15000);
    return () => window.clearInterval(interval);
  }, [user.id, user.role]);

  useEffect(() => {
    if (user.id === 'guest' || isAdminRole(user.role)) return;

    const pollMyOrders = async () => {
      try {
        const latestOrders = await api.getMyOrders();
        setOrders(latestOrders);
      } catch (error) {
        console.error(error);
      }
    };

    const interval = window.setInterval(pollMyOrders, 15000);
    return () => window.clearInterval(interval);
  }, [user.id, user.role]);

  const navigateTo = (page: string, slug?: string, replace = false) => {
    const knownPages = new Set([
      'admin-dashboard', 'admin-login', 'admin-register-authentication', 'admin-not-found',
      'home', 'login', 'register', 'cart', 'order-track', 'subscription', 'about', 'contact',
      'privacy-policy', 'data-deletion', 'terms', 'profile', 'auth-callback', 'user-dashboard',
      'category', 'product', 'not-found'
    ]);
    const nextPage = knownPages.has(page) ? page : (page.startsWith('admin') ? 'admin-not-found' : 'not-found');
    if (!knownPages.has(page)) {
      console.warn(`Unknown navigation target "${page}". Redirecting to ${nextPage}.`);
    }

    const normalizedSlug = nextPage === 'admin-dashboard' ? getNormalizedAdminSlug(slug) : slug || '';
    setCurrentPage(nextPage);
    setCurrentSlug(normalizedSlug);
    const nextPath = getPathForPage(nextPage, normalizedSlug);
    if (window.location.pathname !== nextPath) {
      if (replace) {
        window.history.replaceState({}, '', nextPath);
      } else {
        window.history.pushState({}, '', nextPath);
      }
    }
    window.scrollTo(0, 0);
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: true, message, type });
    if (type === 'success') {
      notificationTimerRef.current = window.setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
        notificationTimerRef.current = null;
      }, 1500);
    }
  };

  const handleLoginSuccess = (token: string, user: User, redirectPath?: string) => {
    localStorage.setItem('token', token);
    setIsAuthResolved(true);
    setUser(user);
    if (isAdminRole(user.role)) {
      if (redirectPath) {
        setPendingNavigation(null);
        const route = resolveRouteFromPath(new URL(redirectPath, window.location.origin).pathname);
        navigateTo(route.page, route.slug);
        return;
      }
      if (pendingNavigation && pendingNavigation.page.startsWith('admin')) {
        const nextRoute = pendingNavigation;
        setPendingNavigation(null);
        navigateTo(nextRoute.page, nextRoute.slug);
        return;
      }
      setPendingNavigation(null);
      navigateTo('admin-dashboard');
      return;
    }
    if (redirectPath) {
      setPendingNavigation(null);
      const route = resolveRouteFromPath(new URL(redirectPath, window.location.origin).pathname);
      navigateTo(route.page, route.slug);
      return;
    }
    if (pendingNavigation) {
      const nextRoute = pendingNavigation;
      setPendingNavigation(null);
      navigateTo(nextRoute.page, nextRoute.slug);
      return;
    }
    navigateTo('user-dashboard');
  };
  const handleLogout = () => {
    const shouldReturnToAdminLogin =
      currentPage === 'admin-dashboard' ||
      currentPage === 'admin-login' ||
      currentPage === 'admin-register-authentication';
    localStorage.removeItem('token');
    setUser(INITIAL_GUEST);
    setClientNotifications([]);
    setPendingNavigation(null);
    navigateTo(shouldReturnToAdminLogin ? 'admin-login' : 'home');
  };

  const handleAccountDeleted = () => {
    localStorage.removeItem('token');
    setUser(INITIAL_GUEST);
    setOrders([]);
    setClientNotifications([]);
    setCartCount(getGuestCartCount());
    setPendingNavigation(null);
    navigateTo('home');
    showNotification('Votre compte a été supprimé avec succès.');
  };

  const requireLoginFor = (page: string, slug?: string) => {
    setPendingNavigation({ page, slug });
    navigateTo('login');
  };

  useLayoutEffect(() => {
    if (!isAuthResolved) {
      return;
    }

    if (
      (currentPage === 'admin-dashboard' ||
        currentPage === 'admin-register-authentication' ||
        currentPage === 'admin-not-found') &&
      !isAdminRole(user.role)
    ) {
      const intendedRoute =
        currentPage === 'admin-dashboard'
          ? { page: currentPage, slug: currentSlug }
          : { page: currentPage as 'admin-register-authentication' | 'admin-not-found' };
      setPendingNavigation((current) => {
        if (current?.page === intendedRoute.page && current?.slug === intendedRoute.slug) {
          return current;
        }
        return intendedRoute;
      });
      navigateTo('admin-login', undefined, true);
      return;
    }

    if (currentPage === 'admin-login') {
      if (isAdminRole(user.role)) {
        navigateTo('admin-dashboard', undefined, true);
        return;
      }

      if (user.id !== 'guest') {
        navigateTo('home', undefined, true);
      }
    }

    if (currentPage === 'admin-dashboard' && !canAccessAdminTab(user.role, currentAdminTab)) {
      navigateTo('admin-dashboard', undefined, true);
    }
  }, [currentAdminTab, currentPage, currentSlug, isAuthResolved, user.id, user.role]);
  
  const handleAddToCart = async (listing: Listing) => {
    const variants = listing.variants || [];
    const variantId = variants.length > 0 ? selectedVariantId : undefined;
    const selectedVariant = variantId ? variants.find((variant) => variant.id === variantId) : undefined;

    if (variants.length > 0 && !selectedVariant) {
        showNotification('Veuillez choisir une variante avant d’ajouter au panier', 'error');
        return;
    }

    if (user.id === 'guest') {
        addGuestCartItem(listing.id, variantId);
        setCartCount(getGuestCartCount());
        showNotification(`${listing.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} ajouté au panier`);
        return;
    }

    try {
        await api.addToCart(listing.id, variantId);
        setCartCount(prev => prev + 1);
        showNotification(`${listing.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} ajouté au panier`);
    } catch (error) {
        showNotification(error instanceof Error ? error.message : "Impossible d'ajouter ce produit au panier", 'error');
    }
  };

  const updateCartCount = (count: number) => {
    setCartCount(count);
  };

  const handleCreateListing = async (listing: Partial<Listing>) => {
    try {
      await api.createListing(listing);
      refreshData();
      showNotification("Produit créé avec succès !");
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Erreur", 'error');
      throw error;
    }
  };
  const handleUpdateListing = async (listingId: string, listing: Partial<Listing>) => {
    try {
      await api.updateListing(listingId, listing);
      refreshData();
      showNotification("Produit mis à jour avec succès !");
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Erreur", 'error');
      throw error;
    }
  };
  const handleDeleteListing = async (listingId: string) => {
    try {
      const result = await api.deleteListing(listingId);
      if (selectedProduct?.id === listingId) {
        setSelectedProduct(null);
        navigateTo('home');
      }
      refreshData();
      showNotification(result.archived ? (result.message || "Produit archivé avec succès !") : "Produit supprimé avec succès !");
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Erreur", 'error');
      throw error;
    }
  };
  const handleViewProduct = (l: Listing) => {
    setSelectedProduct(l);
    setSelectedVariantId(l.variants?.[0]?.id || '');
    navigateTo('product', l.slug);
  };

  const handleOrderCreated = (order: Order) => {
    setOrders(prev => {
      const exists = prev.some((current) => current.id === order.id);
      return exists
        ? prev.map((current) => current.id === order.id ? { ...current, ...order } : current)
        : [order, ...prev];
    });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
        await api.updateOrderStatus(orderId, status);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        showNotification("Statut de la commande mis à jour");
    } catch (err) {
        console.error(err);
        showNotification("Erreur lors de la mise à jour", 'error');
    }
  };

  const handleResendOrderInvoiceEmail = async (orderId: string) => {
    try {
        const updatedOrder = await api.resendOrderInvoiceEmail(orderId);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
        if (updatedOrder.emailStatus === 'FAILED') {
          showNotification(updatedOrder.emailError || "L'email de facture n'a pas pu être envoyé", 'error');
          return;
        }
        showNotification("Email de facture renvoyé");
    } catch (err) {
        console.error(err);
        showNotification(err instanceof Error ? err.message : "Erreur d'envoi email", 'error');
    }
  };

  const handleAdminOrderAction = async (
    action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery',
    orderId: string,
    payload?: any
  ) => {
    try {
      const updatedOrder =
        action === 'approvePayment' ? await api.approveOrderPayment(orderId) :
        action === 'rejectPayment' ? await api.rejectOrderPayment(orderId, payload?.reason || 'Paiement rejeté.') :
        action === 'createDelivery' ? await api.createOrderDelivery(orderId, payload) :
        action === 'sendDelivery' ? await api.sendOrderDelivery(orderId) :
        await api.resendOrderDeliveryEmail(orderId);

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
      showNotification("Commande mise à jour");
    } catch (err) {
      console.error(err);
      showNotification(err instanceof Error ? err.message : "Action admin impossible", 'error');
      throw err;
    }
  };

  const handleUpdateSiteConfig = async (config: Partial<SiteConfig>) => {
    try {
        const nextConfig = await api.updateSiteConfig(config);
        setSiteConfig(nextConfig);
        showNotification("Configuration du site mise à jour");
    } catch (err) {
        console.error(err);
        showNotification(err instanceof Error ? err.message : "Erreur lors de la mise à jour", 'error');
        throw err;
    }
  };

  const handleMarkClientNotificationRead = async (notificationId: string) => {
    try {
      const updated = await api.markNotificationRead(notificationId);
      setClientNotifications((current) => current.map((item) => item.id === notificationId ? updated : item));
      previousClientNotificationsRef.current.set(notificationId, updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllClientNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      const now = new Date().toISOString();
      setClientNotifications((current) => {
        const next = current.map((item) => ({ ...item, read: true, readAt: item.readAt || now }));
        previousClientNotificationsRef.current = new Map(next.map((item) => [item.id, item]));
        return next;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home listings={publicListings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} siteConfig={siteConfig} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="login" socialNextPath={pendingNavigation ? getPathForPage(pendingNavigation.page, pendingNavigation.slug) : '/dashboard'} />;
      case 'register': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="register" socialNextPath={pendingNavigation ? getPathForPage(pendingNavigation.page, pendingNavigation.slug) : '/dashboard'} />;
      case 'admin-login': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="login" audience="admin" />;
      case 'cart': return <Cart navigateTo={navigateTo} onCartUpdate={updateCartCount} siteConfig={siteConfig} listings={publicListings} user={user} orders={orders} onOrderCreated={handleOrderCreated} />;
      case 'order-track': return <OrderTracking />;
      case 'subscription': return <Subscription user={user} onSubscribe={() => refreshData()} navigateTo={navigateTo} onRequireLogin={() => requireLoginFor('subscription')} />;
      case 'about': return <About siteConfig={siteConfig} navigateTo={navigateTo} />;
      case 'contact': return <Contact siteConfig={siteConfig} navigateTo={navigateTo} />;
      case 'privacy-policy': return <PrivacyPolicy siteConfig={siteConfig} />;
      case 'data-deletion': return <DataDeletion siteConfig={siteConfig} />;
      case 'terms': return <Terms siteConfig={siteConfig} />;
      
      case 'category': {
        if (!isCatalogResolved) {
          return <RouteLoadingScreen title="Chargement de la catégorie" message="La page est en cours de synchronisation avec le catalogue." />;
        }
        const cat = categories.find(c => c.slug === currentSlug);
        if(!cat) return (
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              Catégorie
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-950">Catégorie introuvable</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              L’URL demandée ne correspond à aucune catégorie active du store.
            </p>
          </div>
        );
        
        // Robust icon lookup
        const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
        const IconComponent = icons[cat.icon] || icons[cat.icon.trim()] || icons.Package;
        
        return <CategoryPage 
            type={cat.id} 
            categoryId={cat.id}
            title={cat.name}
            subtitle={cat.description || ''}
            heroGradient={cat.gradient || 'bg-slate-900'}
            heroImage={cat.imageUrl || ''}
            icon={<IconComponent size={32} className="text-white" />}
            listings={publicListings}
            onViewProduct={handleViewProduct}
            navigateTo={navigateTo}
            subCategories={cat.subCategories}
        />;
      }

      case 'product': {
        if (!isCatalogResolved) {
          return <RouteLoadingScreen title="Chargement du produit" message="Le produit est en cours de chargement depuis le catalogue." />;
        }
        if (!selectedProduct || selectedProduct.isArchived) {
          return (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                Produit
              </div>
              <h1 className="mt-4 text-3xl font-black text-slate-950">Produit introuvable</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Cette URL produit n’existe plus, n’est pas publiée, ou le catalogue n’a pas pu la retrouver.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  Retour accueil
                </button>
              </div>
            </div>
          );
        }
        return (
          <ProductPage
            product={selectedProduct}
            categories={categories}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
            onAddToCart={() => handleAddToCart(selectedProduct)}
            onBuyNow={async () => {
              await handleAddToCart(selectedProduct);
              navigateTo('cart');
            }}
            navigateTo={navigateTo}
          />
        );
      }
      case 'admin-dashboard':
        return <AdminConsolePage
                  user={user} 
                  orders={orders} 
                  listings={listings} 
                  categories={categories} 
                  routeTab={currentAdminTab}
                  onUpdateStatus={handleUpdateOrderStatus} 
                  onAdminOrderAction={handleAdminOrderAction}
                  onCreateListing={handleCreateListing} 
                  onUpdateListing={handleUpdateListing}
                  onDeleteListing={handleDeleteListing}
                  onRefreshCategories={refreshData} 
                  siteConfig={siteConfig}
                  onUpdateSiteConfig={handleUpdateSiteConfig}
                  onResendOrderInvoiceEmail={handleResendOrderInvoiceEmail}
                  navigateTo={navigateTo}
                  focusOrderId={adminFocusOrderId}
                  onFocusOrderHandled={() => setAdminFocusOrderId(null)}
                  onActiveTabChange={(tab) => {
                    if (tab !== currentAdminTab) {
                      openAdminTab(tab);
                    }
                  }}
               />;
      case 'admin-register-authentication':
        return (
          <RegisterAuthenticationAdmin
            navigateTo={navigateTo}
            onNotify={showNotification}
          />
        );
      case 'admin-not-found':
        return <AdminNotFoundPage openAdminTab={openAdminTab} navigateTo={navigateTo} />;
      
      case 'user-dashboard': return (
        <UserDashboard
          user={user}
          orders={orders}
          notifications={clientNotifications}
          navigateTo={navigateTo}
          onMarkNotificationRead={handleMarkClientNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllClientNotificationsRead}
        />
      );
      case 'profile': return <Profile user={user} onUpdateUser={setUser} onDeleteAccountSuccess={handleAccountDeleted} navigateTo={navigateTo} />;
      case 'auth-callback':
        return <AuthCallback onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
      case 'not-found':
        return (
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-red-700">
              404
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-950">Page introuvable</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La page demandée n’existe pas ou le lien utilisé n’est plus valide.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                Retour accueil
              </button>
            </div>
          </div>
        );
      default: return <Home listings={publicListings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} siteConfig={siteConfig} />;
    }
  };

  if (shouldShowStoreLoader) {
    return (
      <StoreBootLoader
        siteConfig={siteConfig}
        message={
          !isCatalogResolved
            ? 'Le catalogue, les produits et les visuels du store sont en cours de chargement.'
            : 'Vérification sécurisée de votre session en cours.'
        }
      />
    );
  }

  if (
    (currentPage === 'admin-dashboard' ||
      currentPage === 'admin-register-authentication' ||
      currentPage === 'admin-not-found') &&
    !isAdminRole(user.role)
  ) {
    return <RouteLoadingScreen title="Redirection sécurisée" message="Redirection vers l’accès administrateur autorisé." />;
  }

  if (currentPage === 'admin-login') {
    return renderContent();
  }

  if (
    currentPage === 'admin-dashboard' ||
    currentPage === 'admin-register-authentication' ||
    currentPage === 'admin-not-found'
  ) {
    return (
      <AdminLayout
        user={user}
        onLogout={handleLogout}
        onOpenStore={() => navigateTo('home')}
        siteConfig={siteConfig}
        notification={notification}
        onCloseNotification={() => setNotification({ ...notification, show: false })}
        adminNotifications={adminNotifications}
        isNotificationCenterOpen={isAdminNotificationCenterOpen}
        blockingOrderNotification={blockingOrderNotification}
        onToggleNotificationCenter={() => setIsAdminNotificationCenterOpen((value) => !value)}
        onCloseNotificationCenter={() => setIsAdminNotificationCenterOpen(false)}
        onMarkAllNotificationsRead={markAllAdminNotificationsRead}
        onOpenAdminNotification={openAdminNotificationOrder}
        activeTab={currentAdminTab}
        onNavClick={openAdminTab}
        onNavigateRegisterAuth={() => navigateTo('admin-register-authentication')}
        pendingOrdersCount={pendingOrdersCount}
        newUsersCount={0}
      >
        {renderContent()}
      </AdminLayout>
    );
  }

  if (currentPage === 'login' || currentPage === 'register' || currentPage === 'auth-callback') {
    return renderContent();
  }

  return (
    <StoreLayout 
      user={user} 
      onLogout={handleLogout} 
      cartCount={cartCount} 
      navigateTo={navigateTo} 
      currentPage={currentPage} 
      categories={categories}
      notification={notification}
      onCloseNotification={() => setNotification({ ...notification, show: false })}
      siteConfig={siteConfig}
    >
      {renderContent()}
    </StoreLayout>
  );
};

export default App;
