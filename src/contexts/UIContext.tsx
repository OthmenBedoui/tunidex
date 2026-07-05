/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type NotificationState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

type UIContextValue = {
  notification: NotificationState;
  closeNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef<number | null>(null);

  const closeNotification = useCallback(() => {
    setNotification((current) => ({ ...current, show: false }));
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }

    setNotification({ show: true, message, type });

    if (type === 'success') {
      notificationTimerRef.current = window.setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
        notificationTimerRef.current = null;
      }, 1500);
    }
  }, []);

  const value = useMemo(() => ({
    notification,
    closeNotification,
    showNotification
  }), [closeNotification, notification, showNotification]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
