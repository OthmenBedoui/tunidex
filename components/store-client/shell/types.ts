import { Category, SiteConfig, User } from '../../../types';

export type StoreNotification = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

export interface StoreShellProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  cartCount: number;
  navigateTo: (page: string, slug?: string) => void;
  currentPage: string;
  categories: Category[];
  notification?: StoreNotification;
  onCloseNotification?: () => void;
  siteConfig: SiteConfig;
}
