/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ClientNotification, UserRole } from '../../types';
import { handleApiError } from '../../utils/apiError';
import { getAdminPathForTab } from '../../pages/admin';
import type { AdminNotificationItem } from '../types/adminNotifications';
import { useAuth } from './AuthContext';
import { useCommerce } from './CommerceContext';
import { useUI } from './UIContext';
import { useNotifications as useNotificationsQuery } from '../hooks/useNotifications';
import { queryKeys } from '../queryKeys';

const mapNotificationTypeToAdminItemType = (type: string): AdminNotificationItem['type'] => {
  if (type === 'USER_REGISTERED') return 'user';
  if (type === 'SYSTEM') return 'system';
  return 'order';
};

type NotificationContextValue = {
  adminNotifications: AdminNotificationItem[];
  clientNotifications: ClientNotification[];
  isAdminNotificationCenterOpen: boolean;
  blockingOrderNotification: AdminNotificationItem | null;
  setIsAdminNotificationCenterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  markAdminNotificationRead: (notificationId: string) => Promise<void>;
  markAllAdminNotificationsRead: () => Promise<void>;
  markClientNotificationRead: (notificationId: string) => Promise<void>;
  markAllClientNotificationsRead: () => Promise<void>;
  openAdminNotificationOrder: (item: AdminNotificationItem) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { siteConfig } = useCommerce();
  const { showNotification } = useUI();
  const lastNotificationPollAtRef = useRef<number | null>(null);
  const [isAdminNotificationCenterOpen, setIsAdminNotificationCenterOpen] = useState(false);
  const [blockingOrderNotification, setBlockingOrderNotification] = useState<AdminNotificationItem | null>(null);
  const notificationsQuery = useNotificationsQuery(user.id !== 'guest', 15000);
  const latestNotifications = notificationsQuery.data || [];

  const adminNotifications = useMemo(() => (
    user.role === UserRole.ADMIN || user.role === UserRole.AGENT
      ? latestNotifications.map((item) => ({
          id: item.id,
          type: mapNotificationTypeToAdminItemType(item.type),
          title: item.title,
          message: item.message,
          orderId: item.orderId || undefined,
          orderNumber: item.orderNumber || undefined,
          userId: item.userId,
          userEmail: typeof item.metadata?.email === 'string' ? item.metadata.email : undefined,
          targetTab: (item.targetTab as AdminNotificationItem['targetTab'] | null) || undefined,
          createdAt: item.createdAt,
          read: !!item.readAt
        }))
      : []
  ), [latestNotifications, user.role]);

  const clientNotifications = useMemo(() => (
    user.role === UserRole.ADMIN || user.role === UserRole.AGENT ? [] : latestNotifications
  ), [latestNotifications, user.role]);

  const playAdminOrderSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.38);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Le navigateur a bloqué le son de notification admin.',
        logContext: 'Unable to play admin notification sound'
      });
    }
  }, []);

  useEffect(() => {
    if (!blockingOrderNotification || siteConfig.adminNotificationSound === false) return;
    playAdminOrderSound();
    const interval = window.setInterval(playAdminOrderSound, 2600);
    return () => window.clearInterval(interval);
  }, [blockingOrderNotification, playAdminOrderSound, siteConfig.adminNotificationSound]);

  useEffect(() => {
    if (user.id === 'guest') {
      lastNotificationPollAtRef.current = null;
      setBlockingOrderNotification(null);
      return;
    }
    if (notificationsQuery.error) {
      handleApiError({
        error: notificationsQuery.error,
        fallbackMessage: 'Impossible de rafraîchir les notifications.',
        logContext: 'Unable to poll notifications'
      });
      return;
    }

    const previousPollAt = lastNotificationPollAtRef.current;
    lastNotificationPollAtRef.current = Date.now();

    if (user.role === UserRole.ADMIN || user.role === UserRole.AGENT) {
      if (previousPollAt && siteConfig.adminNotificationsEnabled !== false) {
        const nextOrderAlert = adminNotifications.find((item) =>
          item.type === 'order' &&
          !item.read &&
          new Date(item.createdAt).getTime() > previousPollAt &&
          latestNotifications.some((source) => source.id === item.id && source.type === 'ORDER_CREATED')
        );

        if (nextOrderAlert) {
          setBlockingOrderNotification(nextOrderAlert);
          setIsAdminNotificationCenterOpen(false);
          showNotification(`Nouvelle commande à traiter: ${nextOrderAlert.orderNumber || 'Commande'}`);
        }
      }
      return;
    }

    setBlockingOrderNotification(null);
  }, [adminNotifications, latestNotifications, notificationsQuery.error, showNotification, siteConfig.adminNotificationsEnabled, user.id, user.role]);

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.markNotificationReadV2(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previousNotifications = queryClient.getQueryData<ClientNotification[]>(queryKeys.notifications) || [];
      queryClient.setQueryData<ClientNotification[]>(queryKeys.notifications, (current = []) => current.map((item) => (
        item.id === notificationId ? { ...item, read: true, readAt: item.readAt || new Date().toISOString() } : item
      )));
      return { previousNotifications };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ClientNotification[]>(queryKeys.notifications, (current = []) => current.map((item) => (
        item.id === updated.id ? updated : item
      )));
    },
    onError: (error, notificationId, context) => {
      queryClient.setQueryData(queryKeys.notifications, context?.previousNotifications || []);
      handleApiError({
        error,
        fallbackMessage: 'Impossible de marquer cette notification comme lue.',
        notify: showNotification,
        logContext: `Unable to mark notification ${notificationId} as read`
      });
    }
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsReadV2(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previousNotifications = queryClient.getQueryData<ClientNotification[]>(queryKeys.notifications) || [];
      const now = new Date().toISOString();
      queryClient.setQueryData<ClientNotification[]>(queryKeys.notifications, (current = []) => current.map((item) => (
        item.read ? item : { ...item, read: true, readAt: item.readAt || now }
      )));
      return { previousNotifications };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.notifications, context?.previousNotifications || []);
      handleApiError({
        error,
        fallbackMessage: 'Impossible de marquer toutes les notifications comme lues.',
        notify: showNotification,
        logContext: 'Unable to mark all notifications as read'
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    }
  });

  const markAdminNotificationRead = useCallback(async (notificationId: string) => {
    await markNotificationReadMutation.mutateAsync(notificationId);
  }, [markNotificationReadMutation]);

  const markAllAdminNotificationsRead = useCallback(async () => {
    await markAllNotificationsReadMutation.mutateAsync();
  }, [markAllNotificationsReadMutation]);

  const markClientNotificationRead = useCallback(async (notificationId: string) => {
    await markNotificationReadMutation.mutateAsync(notificationId);
  }, [markNotificationReadMutation]);

  const markAllClientNotificationsRead = useCallback(async () => {
    await markAllNotificationsReadMutation.mutateAsync();
  }, [markAllNotificationsReadMutation]);

  const openAdminNotificationOrder = useCallback((item: AdminNotificationItem) => {
    if (!item.read) {
      void markAdminNotificationRead(item.id);
    }

    setBlockingOrderNotification(null);
    setIsAdminNotificationCenterOpen(false);

    if (item.orderId) {
      navigate(getAdminPathForTab('orders'));
      showNotification(`Commande ${item.orderNumber || item.orderId} ouverte dans le dashboard`);
      return;
    }

    if (item.targetTab) {
      navigate(getAdminPathForTab(item.targetTab));
      if (item.targetTab === 'users') {
        showNotification('Centre utilisateurs ouvert dans le dashboard');
        return;
      }
      if (item.targetTab === 'settings') {
        showNotification('Paramètres clients ouverts dans le dashboard');
        return;
      }
    }

    showNotification('Notification ouverte dans le dashboard');
  }, [markAdminNotificationRead, navigate, showNotification]);

  const value = useMemo(() => ({
    adminNotifications,
    clientNotifications,
    isAdminNotificationCenterOpen,
    blockingOrderNotification,
    setIsAdminNotificationCenterOpen,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    markClientNotificationRead,
    markAllClientNotificationsRead,
    openAdminNotificationOrder
  }), [
    adminNotifications,
    blockingOrderNotification,
    clientNotifications,
    isAdminNotificationCenterOpen,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    markAllClientNotificationsRead,
    markClientNotificationRead,
    openAdminNotificationOrder
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationCenter = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationProvider');
  }
  return context;
};
