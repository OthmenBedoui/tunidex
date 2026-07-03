import React from 'react';
import {
  Bell,
  LogOut,
  Moon,
  Settings2,
  Shield,
  Store,
  Sun,
  UserPlus,
  UserRoundX,
  WalletCards,
  X
} from 'lucide-react';
import { SiteConfig, User } from '../../types';
import type { AdminNotificationItem } from '../../App';
import { AdminTab } from '../../pages/admin/adminRouteConfig';

interface AdminTopbarProps {
  user: User;
  siteConfig: SiteConfig;
  activeTab: AdminTab;
  onOpenStore: () => void;
  onToggleNotificationCenter: () => void;
  unreadCount: number;
  themeMode: string;
  onToggleTheme: () => void;
  isNotificationCenterOpen: boolean;
  adminNotifications: AdminNotificationItem[];
  onCloseNotificationCenter: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (item: AdminNotificationItem) => void;
  onLogout: () => void;
}

const getNotificationAppearance = (item: AdminNotificationItem) => {
  if (item.type === 'user') {
    return {
      icon: UserPlus,
      unreadIconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      readIconClass: 'bg-emerald-50 text-emerald-500 dark:bg-slate-800 dark:text-slate-300'
    };
  }
  if (item.type === 'account') {
    return {
      icon: UserRoundX,
      unreadIconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      readIconClass: 'bg-rose-50 text-rose-500 dark:bg-slate-800 dark:text-slate-300'
    };
  }
  if (item.type === 'subscription') {
    return {
      icon: WalletCards,
      unreadIconClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
      readIconClass: 'bg-cyan-50 text-cyan-500 dark:bg-slate-800 dark:text-slate-300'
    };
  }
  if (item.type === 'system') {
    return {
      icon: Settings2,
      unreadIconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
      readIconClass: 'bg-violet-50 text-violet-500 dark:bg-slate-800 dark:text-slate-300'
    };
  }
  return {
    icon: Bell,
    unreadIconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    readIconClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
  };
};

const AdminTopbar: React.FC<AdminTopbarProps> = ({
  user,
  siteConfig,
  activeTab,
  onOpenStore,
  onToggleNotificationCenter,
  unreadCount,
  themeMode,
  onToggleTheme,
  isNotificationCenterOpen,
  adminNotifications,
  onCloseNotificationCenter,
  onMarkAllRead,
  onOpenNotification,
  onLogout
}) => {
  void activeTab;

  return (
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-950 text-white shadow-lg dark:border-slate-800">
    <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          {siteConfig.logoUrl ? (
            <img src={siteConfig.logoUrl} alt={siteConfig.siteName} className="h-7 w-7 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-black uppercase">{siteConfig.siteName.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Admin Access</div>
          <div className="truncate text-lg font-black">{siteConfig.siteName} Dashboard</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={onToggleNotificationCenter}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
            aria-label="Notifications admin"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white ring-2 ring-slate-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationCenterOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Centre admin</div>
                  <div className="font-black">Notifications</div>
                </div>
                <div className="flex items-center gap-2">
                  {adminNotifications.length > 0 && (
                    <button type="button" onClick={onMarkAllRead} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                      Tout lu
                    </button>
                  )}
                  <button type="button" onClick={onCloseNotificationCenter} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[430px] overflow-y-auto p-2">
                {adminNotifications.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">Aucune notification pour le moment.</div>
                )}
                {adminNotifications.map((item) => {
                  const appearance = getNotificationAppearance(item);
                  const Icon = appearance.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenNotification(item)}
                      className={`w-full rounded-xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900 ${item.read ? 'bg-white dark:bg-slate-950' : 'bg-amber-50 dark:bg-amber-500/10'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.read ? appearance.readIconClass : appearance.unreadIconClass}`}>
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate text-sm font-black">{item.title}</div>
                            {!item.read && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</div>
                          <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {new Date(item.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-mode-toggle border-white/10 bg-white/10 text-white hover:bg-white/15"
          aria-label={themeMode === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
          title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button onClick={onOpenStore} className="hidden items-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 md:inline-flex">
          <Store size={16} className="mr-2" />
          Accéder au store
        </button>

        <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 md:block">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Connecté en tant que</div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Shield size={14} className="text-emerald-400" />
            {user.username}
          </div>
        </div>

        <button onClick={onLogout} className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
          <LogOut size={16} className="mr-2" />
          Déconnexion
        </button>
      </div>
    </div>
  </header>
  );
};

export default AdminTopbar;
