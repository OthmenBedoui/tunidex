import { UserRole } from '../../types';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'reviews'
  | 'listings'
  | 'create'
  | 'coupons'
  | 'users'
  | 'categories'
  | 'settings'
  | 'customization'
  | 'store-config'
  | 'email-config'
  | 'notification-config'
  | 'seo'
  | 'data';

export type AdminNavItem = {
  id: AdminTab | '__register-auth__';
  label: string;
  icon: string;
  cta?: boolean;
  adminOnly?: boolean;
  staffOnly?: boolean;
  registerAuth?: boolean;
};

export const ADMIN_TABS: AdminTab[] = [
  'overview',
  'orders',
  'reviews',
  'listings',
  'create',
  'coupons',
  'users',
  'categories',
  'settings',
  'customization',
  'store-config',
  'email-config',
  'notification-config',
  'seo',
  'data'
];

export const ADMIN_TAB_SLUGS: Record<AdminTab, string> = {
  overview: '',
  orders: 'orders',
  reviews: 'reviews',
  listings: 'products',
  create: 'products/new',
  coupons: 'coupons',
  users: 'users',
  categories: 'categories',
  settings: 'settings',
  customization: 'design',
  'store-config': 'store-config',
  'email-config': 'email-config',
  'notification-config': 'notification-config',
  seo: 'seo',
  data: 'data'
};

export const ADMIN_SLUG_TO_TAB = new Map<string, AdminTab>(
  Object.entries(ADMIN_TAB_SLUGS).map(([tab, slug]) => [slug, tab as AdminTab])
);

export const adminNavGroups: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'Pilotage',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'TrendingUp' },
      { id: 'orders', label: 'Commandes', icon: 'ShoppingCart' },
      { id: 'reviews', label: 'Avis', icon: 'Star' },
      { id: 'listings', label: 'Produits', icon: 'Box' },
      { id: 'create', label: 'Ajouter produit', icon: 'PlusCircle', cta: true },
      { id: 'coupons', label: 'Coupons', icon: 'TicketPercent' }
    ]
  },
  {
    label: 'Catalogue & Clients',
    items: [
      { id: 'categories', label: 'Catégories', icon: 'FolderTree', staffOnly: true },
      { id: 'users', label: 'Utilisateurs', icon: 'Users', staffOnly: true }
    ]
  },
  {
    label: 'Configuration',
    items: [
      { id: 'store-config', label: 'Store Config', icon: 'Store', adminOnly: true },
      { id: 'customization', label: 'Store Design', icon: 'Palette', adminOnly: true },
      { id: 'email-config', label: 'SMTP & Notifs', icon: 'Mail', adminOnly: true },
      { id: 'notification-config', label: 'SMS / OTP', icon: 'Smartphone', adminOnly: true },
      { id: '__register-auth__', label: 'Auth & Register', icon: 'ShieldCheck', adminOnly: true, registerAuth: true },
      { id: 'seo', label: 'SEO / Marketing', icon: 'SearchCheck', adminOnly: true },
      { id: 'settings', label: 'Paramètres', icon: 'Settings', adminOnly: true },
      { id: 'data', label: 'Data & Maintenance', icon: 'Database', adminOnly: true }
    ]
  }
];

const STAFF_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.AGENT]);
const ADMIN_ONLY_TABS = new Set<AdminTab>([
  'store-config',
  'customization',
  'email-config',
  'notification-config',
  'seo',
  'settings',
  'data'
]);
const STAFF_TABS = new Set<AdminTab>(['categories']);
const ADMIN_TABS_ONLY = new Set<AdminTab>(['users']);

export const isStaffAdminRole = (role: UserRole) => STAFF_ROLES.has(role);

export const canAccessAdminTab = (role: UserRole, tab: AdminTab) => {
  if (ADMIN_ONLY_TABS.has(tab)) return role === UserRole.ADMIN;
  if (ADMIN_TABS_ONLY.has(tab)) return role === UserRole.ADMIN;
  if (STAFF_TABS.has(tab)) return role === UserRole.ADMIN || role === UserRole.AGENT;
  return isStaffAdminRole(role);
};

export const getAdminTabFromSlug = (slug?: string) => {
  const normalized = (slug || '').replace(/^\/+|\/+$/g, '');
  return ADMIN_SLUG_TO_TAB.get(normalized) || null;
};

export const getAdminPathForTab = (tab: AdminTab) => {
  const slug = ADMIN_TAB_SLUGS[tab];
  return slug ? `/admin/${slug}` : '/admin';
};
