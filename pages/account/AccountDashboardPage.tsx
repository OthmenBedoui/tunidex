import React from 'react';
import { UserDashboard } from '../Dashboards';
import { useMyLoyalty } from '../../src/hooks/useMyLoyalty';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCommerce } from '../../src/contexts/CommerceContext';
import { useNotificationCenter } from '../../src/contexts/NotificationContext';
import { useLegacyNavigate } from '../../src/navigation';

const AccountDashboardPage: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { user } = useAuth();
  const { orders } = useCommerce();
  const { clientNotifications, markClientNotificationRead, markAllClientNotificationsRead } = useNotificationCenter();
  const loyaltyQuery = useMyLoyalty(user.role === 'USER');

  return (
    <UserDashboard
      user={user}
      orders={orders}
      notifications={clientNotifications}
      loyaltySummary={loyaltyQuery.data || null}
      navigateTo={navigateTo}
      onMarkNotificationRead={(notificationId) => {
        void markClientNotificationRead(notificationId);
      }}
      onMarkAllNotificationsRead={() => {
        void markAllClientNotificationsRead();
      }}
    />
  );
};

export default AccountDashboardPage;
