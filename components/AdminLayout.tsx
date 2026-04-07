import React from 'react';
import { LayoutDashboard, LogOut, Shield, Store } from 'lucide-react';
import { SiteConfig, User } from '../types';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onOpenStore: () => void;
  siteConfig: SiteConfig;
  notification?: { show: boolean; message: string; type: 'success' | 'error' };
  onCloseNotification?: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  user,
  onLogout,
  onOpenStore,
  siteConfig,
  notification,
  onCloseNotification
}) => {
  return (
    <div className="min-h-screen bg-slate-100">
      {notification && notification.show && (
        <div className="fixed top-24 right-4 z-[100]">
          <div className={`rounded-xl px-5 py-4 text-white shadow-2xl ${notification.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm font-bold">{notification.type === 'error' ? 'Erreur' : 'Succès'}</div>
                <div className="text-xs text-white/80">{notification.message}</div>
              </div>
              <button onClick={onCloseNotification} className="text-white/70 hover:text-white text-sm font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Admin Access</div>
              <div className="text-lg font-black">{siteConfig.siteName} Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 md:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Connecté en tant que</div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Shield size={14} className="text-emerald-400" />
                {user.username}
              </div>
            </div>
            <button onClick={onOpenStore} className="inline-flex items-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
              <Store size={16} className="mr-2" />
              Accéder au store
            </button>
            <button onClick={onLogout} className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
              <LogOut size={16} className="mr-2" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
