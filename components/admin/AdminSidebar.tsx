import React from 'react';
import {
  Box,
  Database,
  FolderTree,
  LogOut,
  Mail,
  Palette,
  PlusCircle,
  SearchCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Users
} from 'lucide-react';
import { SiteConfig, User, UserRole } from '../../types';
import { AdminNavItem, AdminTab, adminNavGroups } from '../../pages/admin/adminRouteConfig';

interface AdminSidebarProps {
  user: User;
  activeTab: AdminTab;
  onNavClick: (tabId: AdminTab) => void;
  onNavigateRegisterAuth: () => void;
  onLogout: () => void;
  siteConfig: SiteConfig;
  pendingOrdersCount?: number;
  newUsersCount?: number;
}

const iconMap = {
  Box,
  Database,
  FolderTree,
  Mail,
  Palette,
  PlusCircle,
  SearchCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Users
} satisfies Record<string, React.ComponentType<{ size?: string | number; className?: string }>>;

const roleLabel = (role: UserRole) => {
  if (role === UserRole.ADMIN) return 'Administrateur';
  if (role === UserRole.SUB_ADMIN) return 'Sous-admin';
  if (role === UserRole.SELLER) return 'Vendeur';
  return role;
};

const canSeeItem = (user: User, item: AdminNavItem) => {
  if (item.adminOnly) return user.role === UserRole.ADMIN;
  if (item.id === 'users') return user.role === UserRole.ADMIN;
  if (item.staffOnly) return user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN;
  return true;
};

const renderBadge = (itemId: string, pendingOrdersCount: number, newUsersCount: number) => {
  if (itemId === 'orders' && pendingOrdersCount > 0) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">{pendingOrdersCount}</span>;
  }
  if (itemId === 'users' && newUsersCount > 0) {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">{newUsersCount}</span>;
  }
  return null;
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  user,
  activeTab,
  onNavClick,
  onNavigateRegisterAuth,
  onLogout,
  siteConfig,
  pendingOrdersCount = 0,
  newUsersCount = 0
}) => (
  <aside className="flex h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          {siteConfig.logoUrl ? (
            <img src={siteConfig.logoUrl} alt={siteConfig.siteName} className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-black uppercase">{siteConfig.siteName.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-950 dark:text-white">{siteConfig.siteName}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Admin Console</div>
        </div>
      </div>
    </div>

    <div className="flex-1 px-3 py-4">
      <nav className="space-y-5">
        {adminNavGroups.map((group) => {
          const items = group.items.filter((item) => canSeeItem(user, item));
          if (items.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap] || Box;
                  const isActive = item.id !== '__register-auth__' && activeTab === item.id;

                  if (item.cta) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavClick(item.id as AdminTab)}
                        className="mt-2 flex w-full items-center gap-3 rounded-xl bg-indigo-600 px-3 py-2.5 text-left text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => (item.registerAuth ? onNavigateRegisterAuth() : onNavClick(item.id as AdminTab))}
                      className={[
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition',
                        isActive
                          ? 'border-l-2 border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                      ].join(' ')}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {renderBadge(item.id, pendingOrdersCount, newUsersCount)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>

    <div className="border-t border-slate-200 p-4 dark:border-slate-800">
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="h-11 w-11 rounded-2xl border border-slate-200 object-cover dark:border-slate-700"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900 dark:text-white">{user.username}</div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{roleLabel(user.role)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </div>
  </aside>
);

export default AdminSidebar;
