export const queryKeys = {
  auth: {
    currentUser: ['auth', 'current-user'] as const
  },
  loyalty: {
    my: ['loyalty', 'my'] as const
  },
  products: ['products'] as const,
  productsCatalog: ['products', 'catalog'] as const,
  productsPage: (params: unknown) => ['products', 'page', params] as const,
  reviews: {
    listing: (listingId: string, params: unknown) => ['reviews', 'listing', listingId, params] as const,
    pending: (params: unknown) => ['reviews', 'pending', params] as const
  },
  blog: {
    publicList: (params: unknown) => ['blog', 'public', params] as const,
    publicDetail: (slug: string) => ['blog', 'public', 'detail', slug] as const,
    adminList: (params: unknown) => ['blog', 'admin', params] as const
  },
  categories: ['categories'] as const,
  siteConfig: ['site-config'] as const,
  cart: ['cart'] as const,
  orders: {
    my: ['orders', 'my'] as const,
    admin: ['orders', 'admin'] as const,
    adminPage: (params: unknown) => ['orders', 'admin', 'page', params] as const,
    adminPendingCount: ['orders', 'admin', 'pending-count'] as const
  },
  adminUsers: ['admin-users'] as const,
  adminUsersPage: (params: unknown) => ['admin-users', 'page', params] as const,
  notifications: ['notifications'] as const,
  adminStats: ['admin-stats'] as const,
  seoAnalytics: ['seo-analytics'] as const
};
