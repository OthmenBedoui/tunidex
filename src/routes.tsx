import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import StoreLayout from '../components/store-client/shell/StoreLayout';
import StoreBootLoader from '../components/store-client/StoreBootLoader';
import { About, AuthCallback, Cart, CategoryPage, CgvPage, Contact, DataDeletion, FaqPage, Home, HowItWorksPage, Login, OrderTracking, PrivacyPolicy, ProductPage, RefundPolicyPage, Subscription, Terms } from '../pages/store';
import RegisterAuthenticationAdmin from '../pages/RegisterAuthenticationAdmin';
import AccountDashboardPage from '../pages/account/AccountDashboardPage';
import AccountProfilePage from '../pages/account/AccountProfilePage';
import { AdminConsolePage, AdminNotFoundPage, ADMIN_TAB_SLUGS, canAccessAdminTab, getAdminTabFromSlug, isStaffAdminRole } from '../pages/admin';
import { api } from '../services/api';
import { addGuestCartItem } from '../utils/guestCart';
import { UserRole } from '../types';
import { handleApiError } from '../utils/apiError';
import { useAuth } from './contexts/AuthContext';
import { useCartState } from './contexts/CartContext';
import { useCommerce } from './contexts/CommerceContext';
import { useNotificationCenter } from './contexts/NotificationContext';
import { useUI } from './contexts/UIContext';
import RouteLoadingScreen from './components/RouteLoadingScreen';
import { useCurrentLegacyPage, useLegacyNavigate } from './navigation';
import { queryKeys } from './queryKeys';

const StoreShell: React.FC = () => {
  const currentPage = useCurrentLegacyPage();
  const navigateTo = useLegacyNavigate();
  const { user, hasStoredToken, isAuthResolved, handleLogout } = useAuth();
  const { cartCount } = useCartState();
  const { categories, siteConfig, isCatalogResolved } = useCommerce();
  const { notification, closeNotification } = useUI();

  if (!isCatalogResolved || (hasStoredToken && !isAuthResolved)) {
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

  return (
    <StoreLayout
      user={user}
      onLogout={handleLogout}
      cartCount={cartCount}
      navigateTo={navigateTo}
      currentPage={currentPage}
      categories={categories}
      notification={notification}
      onCloseNotification={closeNotification}
      siteConfig={siteConfig}
    >
      <Outlet />
    </StoreLayout>
  );
};

const AdminShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigateTo = useLegacyNavigate();
  const { user, handleLogout } = useAuth();
  const { notification, closeNotification } = useUI();
  const { siteConfig, pendingOrdersCount } = useCommerce();
  const {
    adminNotifications,
    isAdminNotificationCenterOpen,
    blockingOrderNotification,
    setIsAdminNotificationCenterOpen,
    markAllAdminNotificationsRead,
    openAdminNotificationOrder
  } = useNotificationCenter();

  const slug = location.pathname.replace(/^\/admin\/?/, '');
  const activeTab = getAdminTabFromSlug(slug) || 'overview';

  return (
    <AdminLayout
      user={user}
      onLogout={handleLogout}
      onOpenStore={() => navigateTo('home')}
      siteConfig={siteConfig}
      notification={notification}
      onCloseNotification={closeNotification}
      adminNotifications={adminNotifications}
      isNotificationCenterOpen={isAdminNotificationCenterOpen}
      blockingOrderNotification={blockingOrderNotification}
      onToggleNotificationCenter={() => setIsAdminNotificationCenterOpen((value) => !value)}
      onCloseNotificationCenter={() => setIsAdminNotificationCenterOpen(false)}
      onMarkAllNotificationsRead={() => void markAllAdminNotificationsRead()}
      onOpenAdminNotification={openAdminNotificationOrder}
      activeTab={activeTab}
      onNavClick={(tab) => navigateTo('admin-dashboard', ADMIN_TAB_SLUGS[tab])}
      onNavigateRegisterAuth={() => navigateTo('admin-register-authentication')}
      pendingOrdersCount={pendingOrdersCount}
      newUsersCount={0}
    >
      {children || <Outlet />}
    </AdminLayout>
  );
};

const RequireUser: React.FC = () => {
  const location = useLocation();
  const { user, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return <RouteLoadingScreen title="Chargement du compte" message="Vérification de votre session en cours." />;
  }

  if (user.id === 'guest') {
    return <Navigate to="/account/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

const RequireAdmin: React.FC = () => {
  const location = useLocation();
  const { user, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return <RouteLoadingScreen title="Redirection sécurisée" message="Vérification de l’accès administrateur." />;
  }

  if (!isStaffAdminRole(user.role)) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

const RequireFullAdmin: React.FC = () => {
  const location = useLocation();
  const { user, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return <RouteLoadingScreen title="Redirection sécurisée" message="Vérification de l’accès administrateur." />;
  }

  if (user.role !== UserRole.ADMIN) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

const HomeRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { categories, publicListings, siteConfig } = useCommerce();
  return <Home listings={publicListings} categories={categories} onViewProduct={(listing) => navigateTo('product', listing.slug)} navigateTo={navigateTo} siteConfig={siteConfig} />;
};

const CategoryRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { slug = '' } = useParams();
  const { categories, publicListings, isCatalogResolved, siteConfig } = useCommerce();

  if (!isCatalogResolved) {
    return <RouteLoadingScreen title="Chargement de la catégorie" message="La page est en cours de synchronisation avec le catalogue." />;
  }

  const category = categories.find((entry) => entry.slug === slug);
  if (!category) {
    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700">Catégorie</div>
        <h1 className="mt-4 text-3xl font-black text-slate-950">Catégorie introuvable</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">L’URL demandée ne correspond à aucune catégorie active du store.</p>
      </div>
    );
  }

  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[category.icon] || icons[category.icon.trim()] || icons.Package;

  return (
    <CategoryPage
      type={category.id}
      categoryId={category.id}
      title={category.name}
      subtitle={category.description || ''}
      heroGradient={category.gradient || 'bg-slate-900'}
      heroImage={category.imageUrl || ''}
      icon={<IconComponent size={32} className="text-white" />}
      listings={publicListings}
      onViewProduct={(listing) => navigateTo('product', listing.slug)}
      navigateTo={navigateTo}
      subCategories={category.subCategories}
    />
  );
};

const ProductRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setCartCount } = useCartState();
  const { showNotification } = useUI();
  const { categories, publicListings, isCatalogResolved, siteConfig } = useCommerce();
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const product = useMemo(() => publicListings.find((entry) => entry.slug === slug) || null, [publicListings, slug]);

  React.useEffect(() => {
    if (!product) return;
    setSelectedVariantId((current) => {
      if (!product.variants?.length) return '';
      if (product.variants.some((variant) => variant.id === current)) return current;
      return product.variants[0].id || '';
    });
  }, [product]);

  if (!isCatalogResolved) {
    return <RouteLoadingScreen title="Chargement du produit" message="Le produit est en cours de chargement depuis le catalogue." />;
  }

  if (!product || product.isArchived) {
    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700">Produit</div>
        <h1 className="mt-4 text-3xl font-black text-slate-950">Produit introuvable</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Cette URL produit n’existe plus, n’est pas publiée, ou le catalogue n’a pas pu la retrouver.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigateTo('home')} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Retour accueil</button>
        </div>
      </div>
    );
  }

  const handleAddToCart = async () => {
    const variants = product.variants || [];
    const variantId = variants.length > 0 ? selectedVariantId : undefined;
    const selectedVariant = variantId ? variants.find((variant) => variant.id === variantId) : undefined;

    if (variants.length > 0 && !selectedVariant) {
      showNotification('Veuillez choisir une variante avant d’ajouter au panier', 'error');
      return;
    }

    if (user.id === 'guest') {
      addGuestCartItem(product.id, variantId);
      setCartCount((current) => current + 1);
      showNotification(`${product.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} ajouté au panier`);
      return;
    }

    try {
      await api.addToCart(product.id, variantId);
      setCartCount((current) => current + 1);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      showNotification(`${product.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} ajouté au panier`);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: "Impossible d'ajouter ce produit au panier",
        notify: showNotification,
        logContext: `Unable to add listing ${product.id} to cart`
      });
    }
  };

  return (
    <ProductPage
      product={product}
      categories={categories}
      selectedVariantId={selectedVariantId}
      onSelectVariant={setSelectedVariantId}
      onAddToCart={handleAddToCart}
      onBuyNow={async () => {
        await handleAddToCart();
        navigateTo('cart');
      }}
      navigateTo={navigateTo}
      siteConfig={siteConfig}
    />
  );
};

const CartRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { user } = useAuth();
  const { updateCartCount } = useCartState();
  const { showNotification } = useUI();
  const { orders, publicListings, siteConfig, onOrderCreated } = useCommerce();

  return (
    <Cart
      navigateTo={navigateTo}
      onCartUpdate={updateCartCount}
      onNotify={showNotification}
      siteConfig={siteConfig}
      listings={publicListings}
      user={user}
      orders={orders}
      onOrderCreated={onOrderCreated}
    />
  );
};

const SubscriptionRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData } = useCommerce();
  const { showNotification } = useUI();

  return (
    <Subscription
      user={user}
      onSubscribe={() => refreshData()}
      navigateTo={navigateTo}
      onRequireLogin={() => navigate('/account/login', { state: { from: { pathname: '/subscription' } } })}
      onNotify={showNotification}
    />
  );
};

const AboutRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { siteConfig } = useCommerce();
  return <About siteConfig={siteConfig} navigateTo={navigateTo} />;
};

const ContactRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { siteConfig } = useCommerce();
  return <Contact siteConfig={siteConfig} navigateTo={navigateTo} />;
};

const CgvRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <CgvPage siteConfig={siteConfig} />;
};

const RefundPolicyRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <RefundPolicyPage siteConfig={siteConfig} />;
};

const HowItWorksRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <HowItWorksPage siteConfig={siteConfig} />;
};

const FaqRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <FaqPage siteConfig={siteConfig} />;
};

const PrivacyPolicyRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <PrivacyPolicy siteConfig={siteConfig} />;
};

const DataDeletionRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <DataDeletion siteConfig={siteConfig} />;
};

const TermsRoute: React.FC = () => {
  const { siteConfig } = useCommerce();
  return <Terms siteConfig={siteConfig} />;
};

const AccountLoginRoute: React.FC<{ mode: 'login' | 'register'; audience?: 'client' | 'admin' }> = ({ mode, audience = 'client' }) => {
  const location = useLocation();
  const navigateTo = useLegacyNavigate();
  const { handleLoginSuccess } = useAuth();
  const { siteConfig } = useCommerce();
  const { showNotification } = useUI();

  const socialNextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  return (
    <Login
      onLoginSuccess={handleLoginSuccess}
      navigateTo={navigateTo}
      onNotify={showNotification}
      siteConfig={siteConfig}
      initialMode={mode}
      audience={audience}
      socialNextPath={socialNextPath || '/account'}
    />
  );
};

const TrackRoute: React.FC = () => {
  const { orderNumber } = useParams();
  const { showNotification } = useUI();
  const { siteConfig } = useCommerce();
  return <OrderTracking onNotify={showNotification} initialOrderNumber={orderNumber} siteConfig={siteConfig} />;
};

const AuthCallbackRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { handleLoginSuccess } = useAuth();
  return <AuthCallback onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
};

const AdminDashboardRoute: React.FC = () => {
  const location = useLocation();
  const navigateTo = useLegacyNavigate();
  const { user } = useAuth();
  const commerce = useCommerce();

  const slug = location.pathname.replace(/^\/admin\/?/, '');
  const currentAdminTab = getAdminTabFromSlug(slug);

  if (!currentAdminTab && slug) {
    return (
      <AdminShell>
        <AdminNotFoundPage openAdminTab={(tab) => navigateTo('admin-dashboard', ADMIN_TAB_SLUGS[tab])} navigateTo={navigateTo} />
      </AdminShell>
    );
  }

  const activeTab = currentAdminTab || 'overview';

  if (!canAccessAdminTab(user.role, activeTab)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminShell>
      <AdminConsolePage
        user={user}
        listings={commerce.listings}
        categories={commerce.categories}
        routeTab={activeTab}
        onUpdateStatus={commerce.updateOrderStatus}
        onAdminOrderAction={commerce.adminOrderAction}
        onCreateListing={commerce.createListing}
        onUpdateListing={commerce.updateListing}
        onDeleteListing={commerce.deleteListing}
        onRefreshCategories={commerce.refreshData}
        siteConfig={commerce.siteConfig}
        onUpdateSiteConfig={commerce.updateSiteConfig}
        onResendOrderInvoiceEmail={commerce.resendOrderInvoiceEmail}
        navigateTo={navigateTo}
        onActiveTabChange={(tab) => navigateTo('admin-dashboard', ADMIN_TAB_SLUGS[tab])}
      />
    </AdminShell>
  );
};

const AdminRegisterAuthRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { showNotification } = useUI();
  return (
    <AdminShell>
      <RegisterAuthenticationAdmin navigateTo={navigateTo} onNotify={showNotification} />
    </AdminShell>
  );
};

const NotFoundRoute: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-red-700">404</div>
      <h1 className="mt-4 text-3xl font-black text-slate-950">Page introuvable</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">La page demandée n’existe pas ou le lien utilisé n’est plus valide.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => navigateTo('home')} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Retour accueil</button>
      </div>
    </div>
  );
};

const LegacyRedirect: React.FC<{ to: string }> = ({ to }) => <Navigate to={to} replace />;

const RouterTree: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LegacyRedirect to="/account/login" />} />
    <Route path="/register" element={<LegacyRedirect to="/account/register" />} />
    <Route path="/dashboard" element={<LegacyRedirect to="/account" />} />
    <Route path="/profile" element={<LegacyRedirect to="/account/profile" />} />
    <Route path="/order-track" element={<LegacyRedirect to="/track" />} />

    <Route path="/account/login" element={<AccountLoginRoute mode="login" />} />
    <Route path="/account/register" element={<AccountLoginRoute mode="register" />} />
    <Route path="/auth/callback" element={<AuthCallbackRoute />} />
    <Route path="/admin/login" element={<AccountLoginRoute mode="login" audience="admin" />} />

    <Route element={<StoreShell />}>
      <Route index element={<HomeRoute />} />
      <Route path="category/:slug" element={<CategoryRoute />} />
      <Route path="product/:slug" element={<ProductRoute />} />
      <Route path="cart" element={<CartRoute />} />
      <Route path="track" element={<TrackRoute />} />
      <Route path="track/:orderNumber" element={<TrackRoute />} />
      <Route path="subscription" element={<SubscriptionRoute />} />
      <Route path="about" element={<AboutRoute />} />
      <Route path="contact" element={<ContactRoute />} />
      <Route path="cgv" element={<CgvRoute />} />
      <Route path="remboursement" element={<RefundPolicyRoute />} />
      <Route path="comment-ca-marche" element={<HowItWorksRoute />} />
      <Route path="faq" element={<FaqRoute />} />
      <Route path="privacy-policy" element={<PrivacyPolicyRoute />} />
      <Route path="data-deletion" element={<DataDeletionRoute />} />
      <Route path="terms" element={<TermsRoute />} />

      <Route element={<RequireUser />}>
        <Route path="account" element={<AccountDashboardPage />} />
        <Route path="account/profile" element={<AccountProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundRoute />} />
    </Route>

    <Route element={<RequireAdmin />}>
      <Route path="/admin/*" element={<AdminDashboardRoute />} />
    </Route>

    <Route element={<RequireFullAdmin />}>
      <Route path="/admin/register-authentication" element={<AdminRegisterAuthRoute />} />
    </Route>
  </Routes>
);

const AppRoutes: React.FC = () => <RouterTree />;

export default AppRoutes;
