export type AdminNotificationItem = {
  id: string;
  type: 'order' | 'user' | 'account' | 'subscription' | 'system';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  userId?: string;
  userEmail?: string;
  targetTab?: 'overview' | 'orders' | 'users' | 'notification-config' | 'settings';
  createdAt: string;
  read: boolean;
};
