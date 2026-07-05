import { Listing, Order, OrderStatus, User, UserRole, SubscriptionTier, Category, SubCategory, CartItem, SiteConfig, GuestCheckoutPayload, AuthProviderConfig, AuthProviderKey, PublicAuthProvider, ClientNotification, PaginatedResponse, AdminOrdersQueryParams, AdminUsersQueryParams, ListingsQueryParams, UploadAssetResponse, Review, ReviewsQueryParams, ReviewsResponse, LoyaltySummary, Coupon, CouponValidationResult, BlogPost, BlogPostsQueryParams } from '../types';

const API_URL = '/api';
const DEFAULT_API_TIMEOUT_MS = 15000;
const TOKEN_STORAGE_KEY = 'token';
const AUTH_LOGOUT_EVENT = 'tunibots:auth-logout';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const storeAccessToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredAccessToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const getStoredAccessToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const clearAuthSession = (options?: { redirectToLogin?: boolean }) => {
  clearStoredAccessToken();
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));

  if (options?.redirectToLogin !== false && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const mergeHeaders = (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers);
  const token = getStoredAccessToken();

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  } else {
    nextHeaders.delete('Authorization');
  }

  return nextHeaders;
};

const buildJsonHeaders = () => mergeHeaders({ 'Content-Type': 'application/json' });
const buildAuthHeaders = () => mergeHeaders();

const buildQueryString = (params?: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

const parseErrorResponse = async (res: Response) => {
  let message = res.statusText;
  try {
    const errorBody = await res.json();
    message = errorBody.error || errorBody.message || message;
  } catch (error) {
    console.warn('Unable to parse API error response body.', error);
  }
  return message;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        });

        if (!res.ok) {
          throw new ApiError(await parseErrorResponse(res), res.status);
        }

        const data = await res.json() as { token: string };
        storeAccessToken(data.token);
        return data.token;
      } catch (error) {
        console.warn('Unable to refresh access token.', error);
        clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

const performFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);
  const externalSignal = init?.signal;
  const handleExternalAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal, credentials: init?.credentials ?? 'same-origin' });
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  }
};

async function fetchBinary(input: RequestInfo, init?: RequestInit): Promise<Blob> {
  try {
    let res = await performFetch(input, init);

    if (res.status === 401 && getStoredAccessToken()) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        res = await performFetch(input, {
          ...init,
          headers: mergeHeaders(init?.headers)
        });
      }
    }

    if (!res.ok) {
      const error = new ApiError(await parseErrorResponse(res), res.status);
      if (error.status === 401) {
        clearAuthSession();
      }
      throw error;
    }

    return await res.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans quelques instants.', 408);
    }

    if (error instanceof TypeError) {
      throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.', 0);
    }

    throw error instanceof ApiError ? error : new ApiError('Une erreur inattendue est survenue. Veuillez réessayer.', 500);
  }
}

async function fetchWithFallback<T>(
  input: RequestInfo,
  init?: RequestInit,
  fallbackData?: T,
  options?: { skipAuthRefresh?: boolean }
): Promise<T> {
  try {
    let res = await performFetch(input, init);

    if (res.status === 401 && !options?.skipAuthRefresh && getStoredAccessToken()) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        res = await performFetch(input, {
          ...init,
          headers: mergeHeaders(init?.headers)
        });
      }
    }

    if (!res.ok) {
      const error = new ApiError(await parseErrorResponse(res), res.status);
      if (error.status === 401) {
        clearAuthSession();
      }
      throw error;
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return await res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new ApiError('Le serveur met trop de temps à répondre. Réessayez dans quelques instants.', 408);
      console.warn(`API Timeout: ${input}`, timeoutError);
      if (fallbackData !== undefined) return fallbackData;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.', 0);
      console.warn(`API Network Fail: ${input}`, error);
      if (fallbackData !== undefined) return fallbackData;
      throw networkError;
    }

    console.warn(`API Fail: ${input}`, error);
    if (fallbackData !== undefined && !(error instanceof ApiError && error.status === 401)) {
      return fallbackData;
    }
    throw error instanceof ApiError ? error : new ApiError('Une erreur inattendue est survenue. Veuillez réessayer.', 500);
  }
}

export type SeoAnalytics = {
  totalVisits: number;
  uniqueVisitors: number;
  dailyVisits: Array<{ date: string; visits: number; productViews: number; categoryViews: number }>;
  topCategories: Array<{ id: string | null; name: string; slug: string; views: number }>;
  topProducts: Array<{ id: string | null; title: string; imageUrl: string; categoryName: string; views: number }>;
};

const normalizePageLimit = (value?: number) => {
  if (!Number.isInteger(value) || !value || value < 1) return 25;
  return Math.min(100, value);
};

const sanitizeAdminOrdersParams = (params: AdminOrdersQueryParams = {}) => ({
  page: params.page,
  cursor: params.cursor,
  limit: normalizePageLimit(params.limit),
  status: params.status && params.status !== 'all' ? params.status : undefined,
  q: params.q?.trim() || undefined,
  sort: params.sort || 'newest'
});

const sanitizeAdminUsersParams = (params: AdminUsersQueryParams = {}) => ({
  page: params.page,
  cursor: params.cursor,
  limit: normalizePageLimit(params.limit),
  role: params.role && params.role !== 'all' ? params.role : undefined,
  q: params.q?.trim() || undefined,
  sort: params.sort || 'newest'
});

const sanitizeListingsParams = (params: ListingsQueryParams = {}) => ({
  page: params.page,
  cursor: params.cursor,
  limit: normalizePageLimit(params.limit),
  q: params.q?.trim() || undefined,
  sort: params.sort || 'newest',
  scope: params.scope || 'public'
});

const sanitizeReviewsParams = (params: ReviewsQueryParams = {}) => ({
  page: params.page,
  cursor: params.cursor,
  limit: normalizePageLimit(params.limit)
});

const sanitizeBlogPostsParams = (params: BlogPostsQueryParams = {}) => ({
  page: params.page,
  cursor: params.cursor,
  limit: normalizePageLimit(params.limit),
  tag: params.tag?.trim() || undefined,
  status: params.status || undefined,
  q: params.q?.trim() || undefined,
  sort: params.sort || 'newest'
});

export const api = {
  // Auth
  login: (email: string, password: string) => fetchWithFallback<{ token: string; user: User }>(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email, password}) }),
  logout: async () => {
    try {
      await fetchWithFallback(`${API_URL}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, undefined, { skipAuthRefresh: true });
    } finally {
      clearAuthSession({ redirectToLogin: false });
    }
  },
  register: (data: {
    email: string;
    password: string;
    username: string;
    fullName: string;
    address: string;
    phone: string;
    paymentMethod?: string;
    whatsappNumber?: string;
    whatsappBotId?: string;
    whatsappOptIn?: boolean;
  }) => fetchWithFallback<{ verificationRequired: boolean; email: string; message: string }>(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  verifyRegistrationOtp: (email: string, otp: string) => fetchWithFallback<{ token: string; user: User }>(`${API_URL}/auth/register/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) }),
  resendRegistrationOtp: (email: string) => fetchWithFallback<{ success: boolean; message: string }>(`${API_URL}/auth/register/resend-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }),
  getCurrentUser: () => fetchWithFallback<User>(`${API_URL}/auth/me`, { headers: buildJsonHeaders() }),
  getMyLoyalty: () => fetchWithFallback<LoyaltySummary>(
    `${API_URL}/users/me/loyalty`,
    { headers: buildJsonHeaders() },
    { balance: 0, redeemableAmount: 0, pointsPerDinar: 0, maxDiscountPercent: 0, history: [] }
  ),
  getPublicAuthProviders: () => fetchWithFallback<PublicAuthProvider[]>(`${API_URL}/auth/providers`, undefined, []),
  
  // Profile & Subscription
  updateProfile: (data: { username: string, avatarUrl?: string, password?: string, fullName?: string, address?: string, phone?: string, paymentMethod?: string, whatsappNumber?: string }) => 
      fetchWithFallback<User>(`${API_URL}/users/profile`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    let res = await performFetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: formData
    });

    if (res.status === 401 && getStoredAccessToken()) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        res = await performFetch(`${API_URL}/uploads`, {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: formData
        });
      }
    }

    if (!res.ok) {
      const error = new ApiError(await parseErrorResponse(res), res.status);
      if (error.status === 401) {
        clearAuthSession();
      }
      throw error;
    }

    return res.json() as Promise<UploadAssetResponse>;
  },
  uploadPaymentProofImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetchWithFallback<UploadAssetResponse>(`${API_URL}/uploads/payment-proof`, {
      method: 'POST',
      body: formData,
      headers: mergeHeaders()
    });
  },
  requestEmailChange: (newEmail: string) =>
      fetchWithFallback<{ success: boolean; message: string }>(`${API_URL}/users/email-change/request`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ newEmail }) }),
  confirmEmailChange: (newEmail: string, otp: string) =>
      fetchWithFallback<User>(`${API_URL}/users/email-change/confirm`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ newEmail, otp }) }),
  deleteAccount: (confirmation: string) =>
      fetchWithFallback<{ success: boolean }>(`${API_URL}/users/me`, { method: 'DELETE', headers: buildJsonHeaders(), body: JSON.stringify({ confirmation }) }),
  sendVerificationEmail: () => fetchWithFallback(`${API_URL}/auth/verify-email`, { method: 'POST', headers: buildJsonHeaders() }),
  updateSubscription: (data: {
    tier: SubscriptionTier;
    fullName: string;
    address: string;
    phone: string;
    paymentMethod: string;
  }) => fetchWithFallback<User>(`${API_URL}/users/subscribe`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data) }),

  // Cart & Checkout
  getCart: () => fetchWithFallback<CartItem[]>(`${API_URL}/cart`, { headers: buildJsonHeaders() }, []),
  addToCart: (listingId: string, variantId?: string) => fetchWithFallback(`${API_URL}/cart`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({listingId, variantId}) }),
  removeFromCart: (itemId: string) => fetchWithFallback(`${API_URL}/cart/${itemId}`, { method: 'DELETE', headers: buildAuthHeaders() }),
  checkout: (data?: { paymentMethod?: string; phone?: string; couponCode?: string }) => fetchWithFallback<Order>(`${API_URL}/checkout`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data || {}) }),
  guestCheckout: (data: GuestCheckoutPayload) => fetchWithFallback<Order>(`${API_URL}/checkout/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  confirmCheckout: (data: GuestCheckoutPayload | (Partial<GuestCheckoutPayload> & { phone?: string }), idempotencyKey: string) => fetchWithFallback<Order>(`${API_URL}/checkout/confirm`, {
    method: 'POST',
    headers: { ...Object.fromEntries(buildJsonHeaders().entries()), 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...data, idempotencyKey })
  }),
  validateCheckoutCoupon: (couponCode: string, subtotal: number) =>
    fetchWithFallback<CouponValidationResult>(`${API_URL}/checkout/coupon/validate`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ couponCode, subtotal })
    }),
  submitOrderPaymentProof: (orderNumber: string, data: { email?: string; reference?: string; proofUrl?: string; paymentMethod?: string; proofMessage?: string }) =>
    fetchWithFallback<Order>(`${API_URL}/orders/${encodeURIComponent(orderNumber)}/payment-proof`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data)
    }),
  downloadOrderInvoicePdf: (orderId: string) =>
    fetchBinary(`${API_URL}/orders/${orderId}/invoice.pdf`, {
      headers: buildAuthHeaders()
    }),

  // Categories
  getCategories: () => fetchWithFallback<Category[]>(`${API_URL}/categories`, undefined, []),
  createCategory: (data: Partial<Category>) => fetchWithFallback(`${API_URL}/categories`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<Category>) => fetchWithFallback(`${API_URL}/categories/${id}`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchWithFallback(`${API_URL}/categories/${id}`, { method: 'DELETE', headers: buildAuthHeaders() }),
  
  createSubCategory: (data: Partial<SubCategory>) => fetchWithFallback(`${API_URL}/subcategories`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  updateSubCategory: (id: string, data: Partial<SubCategory>) => fetchWithFallback(`${API_URL}/subcategories/${id}`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  deleteSubCategory: (id: string) => fetchWithFallback(`${API_URL}/subcategories/${id}`, { method: 'DELETE', headers: buildAuthHeaders() }),
  
  // Listings
  getListingsPage: (params?: ListingsQueryParams) =>
    fetchWithFallback<PaginatedResponse<Listing>>(
      `${API_URL}/listings${buildQueryString(sanitizeListingsParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  getListings: async () => {
    const allItems: Listing[] = [];
    let cursor: string | undefined;

    do {
      const response = await api.getListingsPage({ limit: 100, cursor, scope: 'public', sort: 'newest' });
      allItems.push(...response.items);
      cursor = response.nextCursor || undefined;
    } while (cursor);

    return allItems;
  },
  createListing: (listing: Partial<Listing>) => fetchWithFallback(`${API_URL}/listings`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(listing) }),
  updateListing: (id: string, listing: Partial<Listing>) => fetchWithFallback(`${API_URL}/listings/${id}`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(listing) }),
  deleteListing: (id: string) => fetchWithFallback<{ success: boolean; archived?: boolean; message?: string }>(`${API_URL}/listings/${id}`, { method: 'DELETE', headers: buildAuthHeaders() }),
  getListingReviews: (listingId: string, params?: ReviewsQueryParams) =>
    fetchWithFallback<ReviewsResponse>(
      `${API_URL}/listings/${listingId}/reviews${buildQueryString(sanitizeReviewsParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null, summary: { average: 0, count: 0 } }
    ),
  createReview: (data: { listingId: string; orderId: string; rating: number; comment: string }) =>
    fetchWithFallback<Review>(`${API_URL}/reviews`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data)
    }),
  getBlogPosts: (params?: BlogPostsQueryParams) =>
    fetchWithFallback<PaginatedResponse<BlogPost>>(
      `${API_URL}/blog${buildQueryString(sanitizeBlogPostsParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  getBlogPost: (slug: string) =>
    fetchWithFallback<BlogPost>(`${API_URL}/blog/${encodeURIComponent(slug)}`, { headers: buildJsonHeaders() }),
  getAdminBlogPosts: (params?: BlogPostsQueryParams) =>
    fetchWithFallback<PaginatedResponse<BlogPost>>(
      `${API_URL}/admin/blog${buildQueryString(sanitizeBlogPostsParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  createAdminBlogPost: (data: Partial<BlogPost>) =>
    fetchWithFallback<BlogPost>(`${API_URL}/admin/blog`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data)
    }),
  updateAdminBlogPost: (id: string, data: Partial<BlogPost>) =>
    fetchWithFallback<BlogPost>(`${API_URL}/admin/blog/${id}`, {
      method: 'PATCH',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data)
    }),
  deleteAdminBlogPost: (id: string) =>
    fetchWithFallback<{ success: boolean }>(`${API_URL}/admin/blog/${id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders()
    }),
  getAdminCoupons: () => fetchWithFallback<Coupon[]>(`${API_URL}/admin/coupons`, { headers: buildJsonHeaders() }, []),
  createAdminCoupon: (data: Partial<Coupon>) => fetchWithFallback<Coupon>(`${API_URL}/admin/coupons`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  updateAdminCoupon: (id: string, data: Partial<Coupon>) => fetchWithFallback<Coupon>(`${API_URL}/admin/coupons/${id}`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  deleteAdminCoupon: (id: string) => fetchWithFallback<{ success: boolean }>(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE', headers: buildAuthHeaders() }),
  getPendingReviews: (params?: ReviewsQueryParams) =>
    fetchWithFallback<PaginatedResponse<Review>>(
      `${API_URL}/admin/reviews/pending${buildQueryString(sanitizeReviewsParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  moderateReview: (reviewId: string, status: 'APPROVED' | 'REJECTED') =>
    fetchWithFallback<Review>(`${API_URL}/admin/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ status })
    }),

  // Orders
  getMyOrders: () => fetchWithFallback<Order[]>(`${API_URL}/orders/my`, { headers: buildJsonHeaders() }, []),
  getNotifications: () => fetchWithFallback<ClientNotification[]>(`${API_URL}/notifications`, { headers: buildJsonHeaders() }, []),
  getUnreadNotificationsCount: () => fetchWithFallback<{ count: number }>(`${API_URL}/notifications/unread-count`, { headers: buildAuthHeaders() }, { count: 0 }),
  markNotificationReadV2: (notificationId: string) => fetchWithFallback<ClientNotification>(`${API_URL}/notifications/${notificationId}/read`, { method: 'PATCH', headers: buildAuthHeaders() }),
  markAllNotificationsReadV2: () => fetchWithFallback<{ updated: number; success?: boolean }>(`${API_URL}/notifications/read-all`, { method: 'POST', headers: buildAuthHeaders() }),
  getAllOrders: (params?: AdminOrdersQueryParams) =>
    fetchWithFallback<PaginatedResponse<Order>>(
      `${API_URL}/orders/admin${buildQueryString(sanitizeAdminOrdersParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  trackOrder: (orderNumber: string, params?: { token?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.token) query.set('token', params.token);
    if (params?.email) query.set('email', params.email);
    return fetchWithFallback<Order>(`${API_URL}/orders/${encodeURIComponent(orderNumber)}/track${query.toString() ? `?${query}` : ''}`, { headers: buildJsonHeaders() });
  },
  getOrderDelivery: (orderNumber: string, token?: string) => {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return fetchWithFallback<{ orderNumber: string; deliveries: Array<{ id: string; deliveryContent: string; deliveryType: string; activationGuide?: string; restrictions?: string; region?: string }> }>(`${API_URL}/orders/${encodeURIComponent(orderNumber)}/delivery${query}`, { headers: buildJsonHeaders() });
  },
  updateOrderStatus: (orderId: string, status: OrderStatus) => fetchWithFallback(`${API_URL}/orders/${orderId}/status`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify({status}) }),
  resendOrderInvoiceEmail: (orderId: string) => fetchWithFallback<Order>(`${API_URL}/orders/${orderId}/email/resend`, { method: 'POST', headers: buildAuthHeaders() }),
  approveOrderPayment: (orderId: string) => fetchWithFallback<Order>(`${API_URL}/admin/orders/${orderId}/payment/approve`, { method: 'POST', headers: buildAuthHeaders() }),
  rejectOrderPayment: (orderId: string, reason: string) => fetchWithFallback<Order>(`${API_URL}/admin/orders/${orderId}/payment/reject`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ reason }) }),
  createOrderDelivery: (orderId: string, data: { orderItemId?: string; deliveryType: string; deliveryContent: string; activationGuide?: string; restrictions?: string; region?: string }) =>
    fetchWithFallback<Order>(`${API_URL}/admin/orders/${orderId}/delivery`, { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify(data) }),
  sendOrderDelivery: (orderId: string) => fetchWithFallback<Order>(`${API_URL}/admin/orders/${orderId}/delivery/send`, { method: 'POST', headers: buildAuthHeaders() }),
  resendOrderDeliveryEmail: (orderId: string) => fetchWithFallback<Order>(`${API_URL}/admin/orders/${orderId}/emails/resend-delivery`, { method: 'POST', headers: buildAuthHeaders() }),
  
  // Admin Users
  getAllUsers: (params?: AdminUsersQueryParams) =>
    fetchWithFallback<PaginatedResponse<User>>(
      `${API_URL}/users${buildQueryString(sanitizeAdminUsersParams(params))}`,
      { headers: buildJsonHeaders() },
      { items: [], total: 0, nextCursor: null }
    ),
  updateUserRole: (userId: string, role: UserRole) => fetchWithFallback(`${API_URL}/users/${userId}/role`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify({role}) }),
  updateUserBalance: (userId: string, balance: number) => fetchWithFallback(`${API_URL}/users/${userId}/balance`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify({balance}) }),

  // Site Config
  getSiteConfig: () => fetchWithFallback<SiteConfig>(`${API_URL}/config`, undefined, { logoUrl: 'https://via.placeholder.com/150', siteName: 'TuniBots', logoSize: 32, heroPromoBanners: [], floatingBrandCards: [], storeSections: [] }),
  updateSiteConfig: (config: Partial<SiteConfig>) => fetchWithFallback<SiteConfig>(`${API_URL}/config`, { method: 'PATCH', headers: buildJsonHeaders(), body: JSON.stringify(config) }),
  testEmailConfig: (to: string) => fetchWithFallback<{ success: boolean; message: string; messageId?: string }>(
    `${API_URL}/admin/email/test`,
    { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ to }) }
  ),
  sendClientNotification: (data: { title: string; message: string; targetUserIds?: string[] }) =>
    fetchWithFallback<{ success: boolean; recipients: number; message: string }>(`${API_URL}/admin/notifications/clients`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data)
    }),
  getAuthProviders: () => fetchWithFallback<AuthProviderConfig[]>(`${API_URL}/admin/auth-providers`, { headers: buildJsonHeaders() }, []),
  updateAuthProvider: (
    providerKey: AuthProviderKey,
    data: { enabled?: boolean; updates?: Record<string, string>; clearFields?: string[] }
  ) => fetchWithFallback<AuthProviderConfig>(`${API_URL}/admin/auth-providers/${providerKey}`, {
    method: 'PATCH',
    headers: buildJsonHeaders(),
    body: JSON.stringify(data)
  }),

  // Analytics
  getDailyStats: () => fetchWithFallback<{ dailyStats: { date: string, sales: number, orders: number }[], totalSales: number, totalOrders: number, totalUsers: number, topProducts: Listing[] }>(`${API_URL}/admin/stats`, { headers: buildJsonHeaders() }, { dailyStats: [], totalSales: 0, totalOrders: 0, totalUsers: 0, topProducts: [] }),
  getSeoAnalytics: () => fetchWithFallback<SeoAnalytics>(`${API_URL}/admin/seo/analytics`, { headers: buildJsonHeaders() }, { totalVisits: 0, uniqueVisitors: 0, dailyVisits: [], topCategories: [], topProducts: [] }),
  trackVisit: (data: { path: string; pageType: string; listingId?: string; categoryId?: string; userId?: string; visitorId?: string; referrer?: string }) =>
    fetchWithFallback<{ success: boolean }>(`${API_URL}/analytics/visit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  exportSiteData: async () => {
    let res = await performFetch(`${API_URL}/admin/data/export`, { headers: buildAuthHeaders() });
    if (res.status === 401 && getStoredAccessToken()) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        res = await performFetch(`${API_URL}/admin/data/export`, { headers: buildAuthHeaders() });
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
      }
      throw new Error(await parseErrorResponse(res));
    }
    return res.blob();
  },
  importSiteData: (fileBase64: string) => fetchWithFallback<{ success: boolean; categoriesImported: number; subCategoriesImported: number; productsImported: number }>(
    `${API_URL}/admin/data/import`,
    { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ fileBase64 }) }
  ),
  cleanSiteData: (table: string, confirmation: string) => fetchWithFallback<{ success: boolean; table: string; before: Record<string, number>; after: Record<string, number> }>(
    `${API_URL}/admin/data/clean`,
    { method: 'POST', headers: buildJsonHeaders(), body: JSON.stringify({ table, confirmation }) }
  ),

  // AI
  generateDescription: (game: string, itemType: string, keyFeatures: string) => 
    fetchWithFallback<{text: string}>(`${API_URL}/ai/generate-description`, { 
      method: 'POST', 
      headers: buildJsonHeaders(), 
      body: JSON.stringify({ game, itemType, keyFeatures }) 
    }).then(res => res.text),
  generateBlogDraft: (topic: string) =>
    fetchWithFallback<{ title: string; excerpt: string; content: string }>(`${API_URL}/ai/generate-blog-draft`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ topic })
    }),
};
