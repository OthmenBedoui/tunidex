
import React, { useState } from 'react';
import { ShoppingCart, Search, Menu, User as UserIcon, LogOut, LayoutDashboard, LogIn, CheckCircle, X } from 'lucide-react';
import { User, UserRole, Category } from '../types';
import * as LucideIcons from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  cartCount: number;
  navigateTo: (page: string, slug?: string) => void;
  currentPage: string;
  categories: Category[];
  notification?: { show: boolean; message: string }; // New prop for popup
  onCloseNotification?: () => void; // New prop to close popup
}

// Helper to render icon by string name with robust lookup
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  // Fallback to CircleHelp if icon name is invalid or not found
  const IconComponent = icons[name] || icons[name.trim()] || icons.HelpCircle;
  return <IconComponent size={16} className={className} />;
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  cartCount, 
  navigateTo, 
  currentPage, 
  categories,
  notification,
  onCloseNotification
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification Popup */}
      {notification && notification.show && (
        <div className="fixed top-24 right-4 z-[100] animate-in slide-in-from-right duration-300 fade-in">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-4 border-l-4 border-green-500">
            <div className="bg-green-500/20 p-2 rounded-full">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Succès !</h4>
              <p className="text-xs text-slate-300">{notification.message}</p>
            </div>
            <button onClick={onCloseNotification} className="text-slate-400 hover:text-white pl-4">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        🚀 Bienvenue sur la première plateforme digitale en Tunisie !
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                className="p-2 -ml-2 mr-2 md:hidden text-slate-500 hover:text-slate-700"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center cursor-pointer" onClick={() => navigateTo('home')}>
                <div className="bg-indigo-600 text-white p-1.5 rounded mr-2 font-bold text-xl">T</div>
                <span className="font-bold text-xl tracking-tight text-slate-900">Tunidex</span>
              </div>
            </div>

            <div className="hidden md:flex flex-1 mx-8 max-w-2xl">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Rechercher jeux, items, comptes..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Cart Button with Bubble */}
              {user.role !== UserRole.GUEST && (
                <button className="p-2 text-slate-500 hover:text-indigo-600 relative transition-transform active:scale-95" onClick={() => navigateTo('cart')}>
                  <ShoppingCart size={24} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-indigo-600 text-white text-xs flex items-center justify-center rounded-full font-bold animate-in zoom-in duration-200 border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {user.role === UserRole.GUEST ? (
                <div className="flex items-center space-x-2 ml-2">
                  <button onClick={() => navigateTo('login')} className="text-slate-700 font-medium hover:text-indigo-600 px-3 py-2 text-sm flex items-center"><LogIn size={16} className="mr-1" /> Connexion</button>
                  <button onClick={() => navigateTo('login')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm">S'inscrire</button>
                </div>
              ) : (
                <div className="relative ml-2">
                   <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 focus:outline-none">
                      <div className="h-9 w-9 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                         <img src={user.avatarUrl} alt="User" className="h-full w-full object-cover" />
                      </div>
                   </button>
                   {isProfileOpen && (
                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-bold text-slate-900">{user.username}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        {user.role === UserRole.ADMIN && <button onClick={() => { navigateTo('admin-dashboard'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"><LayoutDashboard size={16} className="mr-2" /> Admin Panel</button>}
                        {user.role === UserRole.USER && <button onClick={() => { navigateTo('user-dashboard'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"><UserIcon size={16} className="mr-2" /> Mon Profil</button>}
                        <button onClick={() => { onLogout(); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center"><LogOut size={16} className="mr-2" /> Déconnexion</button>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="flex space-x-6 text-sm font-medium py-3 overflow-x-auto no-scrollbar">
                <button onClick={() => navigateTo('home')} className={`whitespace-nowrap flex items-center ${currentPage === 'home' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Tout Voir
                </button>
                {categories.map((cat) => (
                   <button 
                    key={cat.id}
                    onClick={() => navigateTo('category', cat.slug)}
                    className={`whitespace-nowrap flex items-center transition-colors text-slate-600 hover:text-indigo-600`}
                  >
                    <DynamicIcon name={cat.icon} className="mr-1" />
                    {cat.name}
                   </button>
                ))}
             </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Tunidex</h3>
            <p className="text-slate-500 mb-6 max-w-sm">La destination premium pour tous vos besoins gaming.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
