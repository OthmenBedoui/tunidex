
import React, { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import Layout from './components/Layout';
import PriceDisplay from './components/PriceDisplay';
import Home from './pages/Home';
import Login from './pages/Login';
import Subscription from './pages/Subscription';
import Cart from './pages/Cart';
import AiTools from './pages/AiTools';
import CategoryPage from './pages/CategoryPage';
import { AdminDashboard, UserDashboard } from './pages/Dashboards';
import { User, UserRole, Listing, Order, OrderStatus, SubscriptionTier, Category, SiteConfig } from './types';
import { api } from './services/api';
import * as LucideIcons from 'lucide-react';
import { hasListingDiscount } from './utils/pricing';
import { addGuestCartItem, getGuestCartCount } from './utils/guestCart';

const INITIAL_GUEST: User = { id: 'guest', username: 'Invité', email: '', role: UserRole.GUEST, balance: 0, avatarUrl: 'https://via.placeholder.com/150', subscriptionTier: SubscriptionTier.FREE };

// --- APP COMPONENT ---
import Profile from './pages/Profile';

type NotificationState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

type PendingNavigation = {
  page: string;
  slug?: string;
} | null;

const isAdminRole = (role: UserRole) =>
  role === UserRole.ADMIN || role === UserRole.SUB_ADMIN || role === UserRole.SELLER;

const resolveRouteFromPath = (pathname: string): { page: string; slug?: string } => {
  if (pathname === '/admin' || pathname === '/admin/') {
    return { page: 'admin-dashboard' };
  }
  if (pathname === '/admin/login') {
    return { page: 'admin-login' };
  }
  if (pathname === '/login') {
    return { page: 'login' };
  }
  if (pathname === '/register') {
    return { page: 'register' };
  }
  if (pathname === '/cart') {
    return { page: 'cart' };
  }
  if (pathname === '/subscription') {
    return { page: 'subscription' };
  }
  if (pathname === '/profile') {
    return { page: 'profile' };
  }
  if (pathname === '/dashboard') {
    return { page: 'user-dashboard' };
  }
  if (pathname.startsWith('/category/')) {
    return { page: 'category', slug: decodeURIComponent(pathname.replace('/category/', '')) };
  }
  if (pathname === '/product') {
    return { page: 'product' };
  }
  return { page: 'home' };
};

const getPathForPage = (page: string, slug?: string) => {
  switch (page) {
    case 'admin-dashboard':
      return '/admin';
    case 'admin-login':
      return '/admin/login';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'cart':
      return '/cart';
    case 'subscription':
      return '/subscription';
    case 'profile':
      return '/profile';
    case 'user-dashboard':
      return '/dashboard';
    case 'category':
      return slug ? `/category/${encodeURIComponent(slug)}` : '/';
    case 'product':
      return '/product';
    case 'home':
    default:
      return '/';
  }
};

const App: React.FC = () => {
  const initialRoute = resolveRouteFromPath(window.location.pathname);
  const [user, setUser] = useState<User>(INITIAL_GUEST);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [currentSlug, setCurrentSlug] = useState(initialRoute.slug || '');
  const [selectedProduct, setSelectedProduct] = useState<Listing | null>(null);
  
  const [cartCount, setCartCount] = useState(0);
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'success' });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ logoUrl: '', siteName: 'Tunidex' });
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(!localStorage.getItem('token'));
  const publicListings = listings.filter((listing) => !listing.isArchived);

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
    const token = localStorage.getItem('token');
    if (token) {
      api.getCurrentUser()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
          setUser(INITIAL_GUEST);
        })
        .finally(() => setIsAuthResolved(true));
    } else {
      setIsAuthResolved(true);
    }
    
    api.getListings().then(setListings).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
    api.getSiteConfig().then(setSiteConfig).catch(console.error);
    
    if (token) {
      api.getCart().then(items => { if(items.length > 0) setCartCount(items.reduce((acc, item) => acc + item.quantity, 0)); else setCartCount(0); }).catch(() => {});
    } else {
      setCartCount(getGuestCartCount());
    }
    
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN || user.role === UserRole.SELLER) {
        api.getAllOrders().then(setOrders).catch(console.error);
    } else if (user.id !== 'guest') {
        api.getMyOrders().then(setOrders).catch(console.error);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    if (siteConfig.siteName) {
        document.title = siteConfig.siteName;
    }
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
  }, [siteConfig]);

  useEffect(() => {
    if (!selectedProduct) return;
    const freshSelectedProduct = listings.find((listing) => listing.id === selectedProduct.id);
    if (freshSelectedProduct) {
      setSelectedProduct(freshSelectedProduct);
    }
  }, [listings, selectedProduct]);

  const refreshData = () => {
      api.getListings().then(setListings).catch(console.error);
      api.getCategories().then(setCategories).catch(console.error);
  };

  const navigateTo = (page: string, slug?: string, replace = false) => {
    setCurrentPage(page);
    setCurrentSlug(slug || '');
    const nextPath = getPathForPage(page, slug);
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
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleLoginSuccess = (token: string, user: User) => {
    localStorage.setItem('token', token);
    setIsAuthResolved(true);
    setUser(user);
    if (isAdminRole(user.role)) {
      setPendingNavigation(null);
      navigateTo('admin-dashboard');
      return;
    }
    if (pendingNavigation) {
      const nextRoute = pendingNavigation;
      setPendingNavigation(null);
      navigateTo(nextRoute.page, nextRoute.slug);
      return;
    }
    navigateTo('home');
  };
  const handleLogout = () => {
    const shouldReturnToAdminLogin = currentPage === 'admin-dashboard' || currentPage === 'admin-login';
    localStorage.removeItem('token');
    setUser(INITIAL_GUEST);
    setPendingNavigation(null);
    navigateTo(shouldReturnToAdminLogin ? 'admin-login' : 'home');
  };
  const requireLoginFor = (page: string, slug?: string) => {
    setPendingNavigation({ page, slug });
    navigateTo('login');
  };

  useEffect(() => {
    if (!isAuthResolved) {
      return;
    }

    if (currentPage === 'admin-dashboard' && !isAdminRole(user.role)) {
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
  }, [currentPage, isAuthResolved, user.id, user.role]);
  
  const handleAddToCart = async (listing: Listing) => {
    if (user.id === 'guest') {
        addGuestCartItem(listing.id);
        setCartCount(getGuestCartCount());
        showNotification(`${listing.title} ajouté au panier`);
        return;
    }

    try {
        await api.addToCart(listing.id);
        setCartCount(prev => prev + 1);
        showNotification(`${listing.title} ajouté au panier`);
    } catch {
        setCartCount(prev => prev + 1);
        showNotification(`${listing.title} ajouté au panier`);
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
  const handleViewProduct = (l: Listing) => { setSelectedProduct(l); navigateTo('product'); };

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

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home listings={publicListings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} siteConfig={siteConfig} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="login" />;
      case 'register': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="register" />;
      case 'admin-login': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} siteConfig={siteConfig} initialMode="login" audience="admin" />;
      case 'cart': return <Cart navigateTo={navigateTo} onCartUpdate={updateCartCount} siteConfig={siteConfig} listings={publicListings} user={user} />;
      case 'subscription': return <Subscription user={user} onSubscribe={() => refreshData()} navigateTo={navigateTo} onRequireLogin={() => requireLoginFor('subscription')} />;
      
      case 'category': {
        const cat = categories.find(c => c.slug === currentSlug);
        if(!cat) return <div className="p-8 text-center text-indigo-500">Catégorie introuvable</div>;
        if(cat.slug === 'ai-tools') return <AiTools listings={publicListings} onViewProduct={handleViewProduct} navigateTo={navigateTo} />;
        
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
        if (!selectedProduct || selectedProduct.isArchived) return <Home listings={publicListings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} siteConfig={siteConfig} />;
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-5xl mx-auto my-8 animate-in fade-in zoom-in duration-300">
                <button onClick={() => navigateTo('home')} className="mb-6 text-slate-500 hover:text-indigo-600 font-medium flex items-center"><LucideIcons.ArrowLeft size={16} className="mr-2"/> Retour à la boutique</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <img src={selectedProduct.imageUrl} className="rounded-2xl w-full h-auto object-cover shadow-lg mb-4 hover:scale-[1.02] transition-transform duration-500" />
                        {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                                {selectedProduct.gallery.map((img, i) => (
                                    <img key={i} src={img} className="rounded-lg border cursor-pointer hover:border-indigo-500 hover:opacity-80 transition" onClick={(e) => ((e.target as HTMLImageElement).parentNode?.previousSibling as HTMLImageElement).src = img} />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">{selectedProduct.game}</span>
                        <h1 className="text-4xl font-black mb-4 text-slate-900">{selectedProduct.title}</h1>
                        <div className="flex items-center space-x-4 mb-6">
                           <PriceDisplay
                             listing={selectedProduct}
                             priceClassName="text-5xl font-black text-slate-900"
                             oldPriceClassName="text-lg font-semibold text-slate-400 line-through"
                             suffixClassName="text-lg font-medium text-slate-500"
                           />
                           {selectedProduct.stock > 0 ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">En Stock</span> : <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Rupture</span>}
                        </div>
                        
                        <div className="prose prose-slate mb-8 text-slate-600">{selectedProduct.description}</div>
                        
                        <div className="mt-auto space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center text-slate-600">
                                    <LucideIcons.Clock size={18} className="mr-2 text-indigo-500" />
                                    <span className="text-sm font-medium">Disponibilité:</span>
                                </div>
                                <span className={`text-sm font-bold ${selectedProduct.isInstant ? 'text-green-600' : 'text-amber-600'}`}>
                                    {selectedProduct.isInstant ? 'Instantanée' : selectedProduct.preparationTime}
                                </span>
                            </div>
                            <button onClick={() => handleAddToCart(selectedProduct)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 text-lg">
                                Ajouter au Panier
                            </button>
                            <p className="text-center text-xs text-slate-400">Livraison estimée: {selectedProduct.isInstant ? 'Immédiate' : selectedProduct.preparationTime}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
      }
      case 'admin-dashboard':
        return <AdminDashboard 
                  user={user} 
                  orders={orders} 
                  listings={listings} 
                  categories={categories} 
                  onUpdateStatus={handleUpdateOrderStatus} 
                  onCreateListing={handleCreateListing} 
                  onUpdateListing={handleUpdateListing}
                  onDeleteListing={handleDeleteListing}
                  onRefreshCategories={refreshData} 
                  siteConfig={siteConfig}
                  onUpdateSiteConfig={handleUpdateSiteConfig}
               />;
      
      case 'user-dashboard': return <UserDashboard user={user} orders={orders} navigateTo={navigateTo} />;
      case 'profile': return <Profile user={user} onUpdateUser={setUser} navigateTo={navigateTo} />;
      default: return <Home listings={publicListings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} siteConfig={siteConfig} />;
    }
  };

  if (currentPage === 'admin-login') {
    return renderContent();
  }

  if (currentPage === 'admin-dashboard') {
    return (
      <AdminLayout
        user={user}
        onLogout={handleLogout}
        onOpenStore={() => navigateTo('home')}
        siteConfig={siteConfig}
        notification={notification}
        onCloseNotification={() => setNotification({ ...notification, show: false })}
      >
        {renderContent()}
      </AdminLayout>
    );
  }

  if (currentPage === 'login' || currentPage === 'register') {
    return renderContent();
  }

  return (
    <Layout 
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
    </Layout>
  );
};

export default App;
