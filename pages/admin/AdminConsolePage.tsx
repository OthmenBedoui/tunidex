import React from 'react';
import { AdminDashboard } from '../Dashboards';
import { Category, Listing, OrderStatus, SiteConfig, User } from '../../types';
import { AdminTab } from './adminRouteConfig';

interface AdminConsolePageProps {
  user: User;
  listings: Listing[];
  categories: Category[];
  siteConfig: SiteConfig;
  routeTab: AdminTab;
  navigateTo: (page: string, slug?: string) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAdminOrderAction: (action: 'approvePayment' | 'rejectPayment' | 'createDelivery' | 'sendDelivery' | 'resendDelivery', orderId: string, payload?: unknown) => Promise<void>;
  onCreateListing: (listing: Partial<Listing>) => Promise<void>;
  onUpdateListing: (listingId: string, listing: Partial<Listing>) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onRefreshCategories: () => void;
  onUpdateSiteConfig: (config: Partial<SiteConfig>) => void;
  onResendOrderInvoiceEmail: (orderId: string) => Promise<void>;
  focusOrderId?: string | null;
  onFocusOrderHandled?: () => void;
  onActiveTabChange?: (tab: AdminTab) => void;
}

const AdminConsolePage: React.FC<AdminConsolePageProps> = ({
  routeTab,
  ...props
}) => (
  <AdminDashboard
    {...props}
    routeTab={routeTab}
  />
);

export default AdminConsolePage;
