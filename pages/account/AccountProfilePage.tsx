import React from 'react';
import ProfilePage from '../store/ProfilePage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useUI } from '../../src/contexts/UIContext';
import { useLegacyNavigate } from '../../src/navigation';

const AccountProfilePage: React.FC = () => {
  const navigateTo = useLegacyNavigate();
  const { user, setUser, handleAccountDeleted } = useAuth();
  const { showNotification } = useUI();

  return (
    <ProfilePage
      user={user}
      onUpdateUser={setUser}
      onDeleteAccountSuccess={handleAccountDeleted}
      navigateTo={navigateTo}
      onNotify={showNotification}
    />
  );
};

export default AccountProfilePage;
