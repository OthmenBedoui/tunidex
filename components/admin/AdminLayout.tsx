import React from 'react';
import { AlertCircle, Bell, CheckCircle2, ClipboardList, X } from 'lucide-react';
import { SiteConfig, User } from '../../types';
import type { AdminNotificationItem } from '../../src/types/adminNotifications';
import { useThemeMode } from '../../utils/themeMode';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { AdminTab } from '../../pages/admin/adminRouteConfig';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onOpenStore: () => void;
  siteConfig: SiteConfig;
  notification?: { show: boolean; message: string; type: 'success' | 'error' };
  onCloseNotification?: () => void;
  adminNotifications?: AdminNotificationItem[];
  isNotificationCenterOpen?: boolean;
  blockingOrderNotification?: AdminNotificationItem | null;
  onToggleNotificationCenter?: () => void;
  onCloseNotificationCenter?: () => void;
  onMarkAllNotificationsRead?: () => void;
  onOpenAdminNotification?: (item: AdminNotificationItem) => void;
  activeTab?: AdminTab;
  onNavClick?: (tabId: AdminTab) => void;
  onNavigateRegisterAuth?: () => void;
  pendingOrdersCount?: number;
  newUsersCount?: number;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  user,
  onLogout,
  onOpenStore,
  siteConfig,
  notification,
  onCloseNotification,
  adminNotifications = [],
  isNotificationCenterOpen = false,
  blockingOrderNotification,
  onToggleNotificationCenter,
  onCloseNotificationCenter,
  onMarkAllNotificationsRead,
  onOpenAdminNotification,
  activeTab = 'overview',
  onNavClick,
  onNavigateRegisterAuth,
  pendingOrdersCount = 0,
  newUsersCount = 0
}) => {
  const { themeMode, toggleThemeMode } = useThemeMode();
  const unreadCount = adminNotifications.filter((item) => !item.read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      {blockingOrderNotification && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-white">
              Nouvelle commande à traiter
            </div>
            <div className="p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Bell size={34} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">{blockingOrderNotification.orderNumber || 'Commande reçue'}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Une commande vient d'arriver. Cette alerte reste bloquante jusqu'à consultation dans le dashboard.
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                    {blockingOrderNotification.message}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenAdminNotification?.(blockingOrderNotification)}
                className="mt-7 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-wider text-white hover:bg-amber-600"
              >
                <ClipboardList size={18} className="mr-2" />
                Consulter la commande
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar
        user={user}
        activeTab={activeTab}
        onNavClick={(tabId) => onNavClick?.(tabId)}
        onNavigateRegisterAuth={() => onNavigateRegisterAuth?.()}
        onLogout={onLogout}
        siteConfig={siteConfig}
        pendingOrdersCount={pendingOrdersCount}
        newUsersCount={newUsersCount}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
      {notification && notification.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-300 ${
            notification.type === 'error' ? 'border-red-100' : 'border-emerald-100'
          }`}>
            <div className={`h-1.5 ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  notification.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {notification.type === 'error' ? <AlertCircle size={28} /> : <CheckCircle2 size={28} className="animate-[notification-check_450ms_ease-out]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black text-slate-900">{notification.type === 'error' ? 'Erreur' : 'Succès'}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</div>
                </div>
                {notification.type === 'error' && (
                  <button
                    type="button"
                    onClick={onCloseNotification}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Fermer la notification"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminTopbar
        user={user}
        siteConfig={siteConfig}
        activeTab={activeTab}
        onOpenStore={onOpenStore}
        onToggleNotificationCenter={() => onToggleNotificationCenter?.()}
        unreadCount={unreadCount}
        themeMode={themeMode}
        onToggleTheme={toggleThemeMode}
        isNotificationCenterOpen={isNotificationCenterOpen}
        adminNotifications={adminNotifications}
        onCloseNotificationCenter={() => onCloseNotificationCenter?.()}
        onMarkAllRead={() => onMarkAllNotificationsRead?.()}
        onOpenNotification={(item) => onOpenAdminNotification?.(item)}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </main>
      </div>
    </div>
  );
};

export default AdminLayout;
