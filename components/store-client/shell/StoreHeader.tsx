import React, { useState } from 'react';
import { LayoutDashboard, LogIn, LogOut, Menu, Moon, Search, ShoppingCart, Sun, User as UserIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Category, SiteConfig, User, UserRole } from '../../../types';
import { useMyLoyalty } from '../../../src/hooks/useMyLoyalty';
import { useThemeMode } from '../../../utils/themeMode';
import StoreCategoryRail from './StoreCategoryRail';

interface StoreHeaderProps {
  user: User;
  cartCount: number;
  navigateTo: (page: string, slug?: string) => void;
  currentPage: string;
  categories: Category[];
  onLogout: () => void;
  siteConfig: SiteConfig;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({
  user,
  cartCount,
  navigateTo,
  currentPage,
  categories,
  onLogout,
  siteConfig
}) => {
  const [, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { themeMode, toggleThemeMode } = useThemeMode();
  const logoSize = Math.min(80, Math.max(24, Number(siteConfig.logoSize || 32)));
  const loyaltyQuery = useMyLoyalty(user.role === UserRole.USER);

  return (
    <>
      <div
        className="border-b border-white/10 px-4 py-2 text-center text-xs font-black tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(227,70,0,0.28)]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #ff8100 0%, #ff6a00 32%, #f05a00 60%, #e34600 100%)'
        }}
      >
        {siteConfig.headerAnnouncement || 'Bienvenue sur la première plateforme digitale en Tunisie !'}
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                className="p-2 -ml-2 mr-2 text-slate-300 hover:text-white md:hidden"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <Menu size={24} />
              </button>
              <div className="flex cursor-pointer items-center" onClick={() => navigateTo('home')}>
                {siteConfig.logoUrl ? (
                  <img
                    src={siteConfig.logoUrl}
                    alt={siteConfig.siteName}
                    className="w-auto object-contain"
                    style={{ height: `${logoSize}px` }}
                  />
                ) : (
                  <div
                    className="theme-bg-accent flex items-center justify-center rounded text-xl font-bold text-white"
                    style={{ height: `${logoSize}px`, width: `${logoSize}px` }}
                  >
                    {siteConfig.siteName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden flex-1 mx-8 max-w-2xl md:flex">
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-white/10 bg-white py-2 pl-10 pr-3 text-slate-900 placeholder-slate-400 transition duration-150 ease-in-out focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder={siteConfig.headerSearchPlaceholder || 'Rechercher jeux, items, comptes...'}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={toggleThemeMode}
                className="theme-mode-toggle border-white/10 bg-white/10 text-white hover:bg-white/15"
                aria-label={themeMode === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
                title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
              >
                {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                className="relative p-2 text-slate-200 transition-transform hover:text-white active:scale-95"
                onClick={() => navigateTo('cart')}
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="theme-bg-accent absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white animate-in zoom-in duration-200">
                    {cartCount}
                  </span>
                )}
              </button>

              {user.role === UserRole.USER && (
                <button
                  type="button"
                  onClick={() => navigateTo('user-dashboard')}
                  className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200 sm:inline-flex"
                >
                  {loyaltyQuery.data?.balance || 0} pts
                </button>
              )}

              {user.role === UserRole.GUEST ? (
                <div className="ml-2 flex items-center space-x-2">
                  <button
                    onClick={() => navigateTo('login')}
                    className="flex items-center px-3 py-2 text-sm font-medium text-white hover:text-slate-200"
                  >
                    <LogIn size={16} className="mr-1" /> Connexion
                  </button>
                  <button onClick={() => navigateTo('register')} className="theme-btn rounded-lg px-4 py-2 text-sm font-bold shadow-sm">
                    {siteConfig.headerCtaLabel || "S'inscrire"}
                  </button>
                </div>
              ) : (
                <div className="relative ml-2">
                  <button onClick={() => setIsProfileOpen((current) => !current)} className="flex items-center space-x-2 focus:outline-none">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-300 bg-slate-200">
                      <img src={user.avatarUrl} alt="User" className="h-full w-full object-cover" />
                    </div>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-100 bg-white py-1 shadow-xl">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">{user.username}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigateTo('profile');
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <UserIcon size={16} className="mr-2" /> Mon Profil
                      </button>
                      {(user.role === UserRole.ADMIN || user.role === UserRole.AGENT) && (
                        <button
                          onClick={() => {
                            navigateTo('admin-dashboard');
                            setIsProfileOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <LayoutDashboard size={16} className="mr-2" /> Admin Panel
                        </button>
                      )}
                      {user.role === UserRole.USER && (
                        <button
                          onClick={() => {
                            navigateTo('user-dashboard');
                            setIsProfileOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <LucideIcons.History size={16} className="mr-2" /> Mes Commandes
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onLogout();
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-left text-sm"
                        style={{ color: 'var(--theme-accent)', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-accent-soft)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <LogOut size={16} className="mr-2" /> Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <StoreCategoryRail currentPage={currentPage} categories={categories} navigateTo={navigateTo} />
      </header>
    </>
  );
};

export default StoreHeader;
