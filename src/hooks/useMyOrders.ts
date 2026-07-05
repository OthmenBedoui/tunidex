import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useMyOrders = (enabled: boolean, refetchInterval = 15000) =>
  useQuery({
    queryKey: queryKeys.orders.my,
    queryFn: api.getMyOrders,
    enabled,
    refetchInterval: enabled ? refetchInterval : false
  });
