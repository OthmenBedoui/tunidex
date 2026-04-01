
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Subscription from './pages/Subscription';
import Cart from './pages/Cart';
import AiTools from './pages/AiTools';
import CategoryPage from './pages/CategoryPage';
import { AdminDashboard, UserDashboard } from './pages/Dashboards';
import { User, UserRole, Listing, Order, OrderStatus, SubscriptionTier, Category } from './types';
import { api } from './services/api';
import * as LucideIcons from 'lucide-react';

const INITIAL_GUEST: User = { id: 'guest', username: 'Invité', email: '', role: UserRole.GUEST, balance: 0, avatarUrl: 'https://via.placeholder.com/150', subscriptionTier: SubscriptionTier.FREE };

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [user, setUser] = useState<User>(INITIAL_GUEST);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [currentSlug, setCurrentSlug] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Listing | null>(null);
  
  const [cartCount, setCartCount] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.getCurrentUser().then(setUser).catch(() => { localStorage.removeItem('token'); setUser(INITIAL_GUEST); });
    
    api.getListings().then(setListings).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
    
    api.getCart().then(items => { if(items.length > 0) setCartCount(items.reduce((acc, item) => acc + item.quantity, 0)); }).catch(() => {});
    
    if (user.role === UserRole.ADMIN || user.role === UserRole.AGENT) {
        api.getAllOrders().then(setOrders).catch(console.error);
    } else if (user.id !== 'guest') {
        api.getMyOrders().then(setOrders).catch(console.error);
    }
  }, [user.id, user.role]);

  const refreshData = () => {
      api.getListings().then(setListings).catch(console.error);
      api.getCategories().then(setCategories).catch(console.error);
  };

  const navigateTo = (page: string, slug?: string) => {
    setCurrentPage(page);
    if(slug) setCurrentSlug(slug);
    window.scrollTo(0, 0);
  };

  const showNotification = (message: string) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  const handleLoginSuccess = (token: string, user: User) => { localStorage.setItem('token', token); setUser(user); navigateTo('home'); };
  const handleLogout = () => { localStorage.removeItem('token'); setUser(INITIAL_GUEST); navigateTo('home'); };
  
  const handleAddToCart = async (listing: Listing) => {
    try { 
        await api.addToCart(listing.id); 
        setCartCount(prev => prev + 1);
        showNotification(`${listing.title} ajouté au panier`);
    } catch { 
        setCartCount(prev => prev + 1);
        showNotification(`${listing.title} ajouté (Mode Démo)`);
    }
  };

  const updateCartCount = (count: number) => {
    setCartCount(count);
  };

  const handleCreateListing = async (listing: Partial<Listing>) => {
    try { await api.createListing(listing); refreshData(); showNotification("Produit créé avec succès !"); } catch { alert("Erreur"); }
  };
  const handleViewProduct = (l: Listing) => { setSelectedProduct(l); navigateTo('product'); };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
        await api.updateOrderStatus(orderId, status);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        showNotification("Statut de la commande mis à jour");
    } catch (err) {
        console.error(err);
        showNotification("Erreur lors de la mise à jour");
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home listings={listings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
      case 'cart': return <Cart navigateTo={navigateTo} onCartUpdate={updateCartCount} />;
      case 'subscription': return <Subscription user={user} onSubscribe={() => refreshData()} navigateTo={navigateTo} />;
      
      case 'category': {
        const cat = categories.find(c => c.slug === currentSlug);
        if(!cat) return <div className="p-8 text-center text-indigo-500">Catégorie introuvable</div>;
        if(cat.slug === 'ai-tools') return <AiTools listings={listings} onViewProduct={handleViewProduct} navigateTo={navigateTo} />;
        
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
            listings={listings}
            onViewProduct={handleViewProduct}
            navigateTo={navigateTo}
            subCategories={cat.subCategories}
        />;
      }

      case 'product': {
        if (!selectedProduct) return <Home listings={listings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} />;
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
                           <div className="text-5xl font-black text-slate-900">{selectedProduct.price.toFixed(2)} <span className="text-lg font-medium text-slate-500">TND</span></div>
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
        return <AdminDashboard user={user} orders={orders} listings={listings} categories={categories} onUpdateStatus={handleUpdateOrderStatus} onCreateListing={handleCreateListing} onRefreshCategories={refreshData} />;
      
      case 'user-dashboard': return <UserDashboard user={user} orders={orders} />;
      default: return <Home listings={listings} categories={categories} onViewProduct={handleViewProduct} navigateTo={navigateTo} />;
    }
  };

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
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
