import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useAdminOrders = (enabled: boolean, refetchInterval: number) =>
  useQuery({
    queryKey: queryKeys.orders.admin,
    queryFn: async () => (await api.getAllOrders({ limit: 25, sort: 'newest' })).items,
    enabled,
    refetchInterval: enabled ? refetchInterval : false
  });
