import { Listing, Order, OrderStatus, User, UserRole, SubscriptionTier, Category, SubCategory, CartItem } from '../types';

const API_URL = '/api';

async function fetchWithFallback<T>(input: RequestInfo, init?: RequestInit, fallbackData?: T): Promise<T> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (error) {
    console.warn(`API Fail: ${input}`, error);
    if (fallbackData) return fallbackData;
    throw error;
  }
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  login: (email: string, password: string) => fetchWithFallback(`${API_URL}/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) }),
  register: (email: string, password: string, username: string) => fetchWithFallback(`${API_URL}/auth/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password, username}) }),
  getCurrentUser: () => fetchWithFallback<User>(`${API_URL}/auth/me`, { headers: getHeaders() }),
  
  // Profile & Subscription
  updateSubscription: (data: { tier: SubscriptionTier, fullName: string, address: string, phone: string, paymentMethod: string }) => 
      fetchWithFallback(`${API_URL}/users/subscribe`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),

  // Cart & Checkout
  getCart: () => fetchWithFallback<CartItem[]>(`${API_URL}/cart`, { headers: getHeaders() }, []),
  addToCart: (listingId: string) => fetchWithFallback(`${API_URL}/cart`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({listingId}) }),
  removeFromCart: (itemId: string) => fetchWithFallback(`${API_URL}/cart/${itemId}`, { method: 'DELETE', headers: getHeaders() }),
  checkout: () => fetchWithFallback<Order>(`${API_URL}/checkout`, { method: 'POST', headers: getHeaders() }),

  // Categories
  getCategories: () => fetchWithFallback<Category[]>(`${API_URL}/categories`, undefined, []),
  createCategory: (data: Partial<Category>) => fetchWithFallback(`${API_URL}/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<Category>) => fetchWithFallback(`${API_URL}/categories/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchWithFallback(`${API_URL}/categories/${id}`, { method: 'DELETE', headers: getHeaders() }),
  
  createSubCategory: (data: Partial<SubCategory>) => fetchWithFallback(`${API_URL}/subcategories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),
  updateSubCategory: (id: string, data: Partial<SubCategory>) => fetchWithFallback(`${API_URL}/subcategories/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }),
  deleteSubCategory: (id: string) => fetchWithFallback(`${API_URL}/subcategories/${id}`, { method: 'DELETE', headers: getHeaders() }),
  
  // Listings
  getListings: () => fetchWithFallback<Listing[]>(`${API_URL}/listings`, undefined, []),
  createListing: (listing: Partial<Listing>) => fetchWithFallback(`${API_URL}/listings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(listing) }),

  // Orders
  getMyOrders: () => fetchWithFallback<Order[]>(`${API_URL}/orders/my`, { headers: getHeaders() }, []),
  getAllOrders: () => fetchWithFallback<Order[]>(`${API_URL}/orders/admin`, { headers: getHeaders() }, []),
  updateOrderStatus: (orderId: string, status: OrderStatus) => fetchWithFallback(`${API_URL}/orders/${orderId}/status`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({status}) }),
  
  // Admin Users
  getAllUsers: () => fetchWithFallback<User[]>(`${API_URL}/users`, { headers: getHeaders() }, []),
  updateUserRole: (userId: string, role: UserRole) => fetchWithFallback(`${API_URL}/users/${userId}/role`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({role}) }),

  // Analytics
  getDailyStats: () => fetchWithFallback<{ dailyStats: { date: string, sales: number, orders: number }[], totalSales: number, totalOrders: number, totalUsers: number, topProducts: Listing[] }>(`${API_URL}/admin/stats`, { headers: getHeaders() }, { dailyStats: [], totalSales: 0, totalOrders: 0, totalUsers: 0, topProducts: [] }),

  // AI
  generateDescription: (game: string, itemType: string, keyFeatures: string) => 
    fetchWithFallback<{text: string}>(`${API_URL}/ai/generate-description`, { 
      method: 'POST', 
      headers: getHeaders(), 
      body: JSON.stringify({ game, itemType, keyFeatures }) 
    }).then(res => res.text),
};