import React from 'react';
import StoreFooter from './StoreFooter';
import StoreHeader from './StoreHeader';
import StoreNotificationModal from './StoreNotificationModal';
import { StoreShellProps } from './types';

const StoreLayout: React.FC<StoreShellProps> = ({
  children,
  user,
  onLogout,
  cartCount,
  navigateTo,
  currentPage,
  categories,
  notification,
  onCloseNotification,
  siteConfig
}) => (
  <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
    <StoreNotificationModal notification={notification} onClose={onCloseNotification} />
    <StoreHeader
      user={user}
      cartCount={cartCount}
      navigateTo={navigateTo}
      currentPage={currentPage}
      categories={categories}
      onLogout={onLogout}
      siteConfig={siteConfig}
    />

    <main className={currentPage === 'product' ? 'flex-grow w-full' : 'flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
      {children}
    </main>

    <StoreFooter categories={categories} navigateTo={navigateTo} siteConfig={siteConfig} />
  </div>
);

export default StoreLayout;
