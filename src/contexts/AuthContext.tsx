/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, clearStoredAccessToken, storeAccessToken } from '../../services/api';
import { handleApiError } from '../../utils/apiError';
import { SubscriptionTier, User, UserRole } from '../../types';
import { useUI } from './UIContext';

const INITIAL_GUEST: User = {
  id: 'guest',
  username: 'Invité',
  email: '',
  role: UserRole.GUEST,
  balance: 0,
  avatarUrl: 'https://via.placeholder.com/150',
  subscriptionTier: SubscriptionTier.FREE
};

type AuthContextValue = {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  isAuthResolved: boolean;
  hasStoredToken: boolean;
  handleLoginSuccess: (token: string, user: User, redirectPath?: string) => void;
  handleLogout: () => Promise<void>;
  handleAccountDeleted: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useUI();
  const [user, setUser] = useState<User>(INITIAL_GUEST);
  const [isAuthResolved, setIsAuthResolved] = useState(!localStorage.getItem('token'));
  const hasStoredToken = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');

    const bootstrap = async () => {
      if (!token) {
        if (isMounted) setIsAuthResolved(true);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        handleApiError({
          error,
          fallbackMessage: 'Votre session n a pas pu être restaurée.',
          logContext: 'Unable to restore current user session'
        });
        clearStoredAccessToken();
        if (isMounted) {
          setUser(INITIAL_GUEST);
        }
      } finally {
        if (isMounted) {
          setIsAuthResolved(true);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = useCallback((token: string, nextUser: User, redirectPath?: string) => {
    storeAccessToken(token);
    setIsAuthResolved(true);
    setUser(nextUser);

    if (redirectPath) {
      navigate(redirectPath, { replace: true });
      return;
    }

    navigate(nextUser.role === UserRole.ADMIN || nextUser.role === UserRole.AGENT ? '/admin' : '/account', { replace: true });
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    const shouldReturnToAdminLogin = location.pathname.startsWith('/admin');
    await api.logout().catch(() => undefined);
    setUser(INITIAL_GUEST);
    navigate(shouldReturnToAdminLogin ? '/admin/login' : '/', { replace: true });
  }, [location.pathname, navigate]);

  const handleAccountDeleted = useCallback(() => {
    clearStoredAccessToken();
    setUser(INITIAL_GUEST);
    navigate('/', { replace: true });
    showNotification('Votre compte a été supprimé avec succès.');
  }, [navigate, showNotification]);

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthResolved,
    hasStoredToken,
    handleLoginSuccess,
    handleLogout,
    handleAccountDeleted
  }), [handleAccountDeleted, handleLoginSuccess, handleLogout, hasStoredToken, isAuthResolved, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
