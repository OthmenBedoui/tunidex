import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useNotifications = (enabled: boolean, refetchInterval = 15000) =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.getNotifications,
    enabled,
    refetchInterval: enabled ? refetchInterval : false
  });
