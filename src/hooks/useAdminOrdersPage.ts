import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AdminOrdersQueryParams } from '../../types';
import { queryKeys } from '../queryKeys';

export const useAdminOrdersPage = (
  params: AdminOrdersQueryParams,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) =>
  useQuery({
    queryKey: queryKeys.orders.adminPage(params),
    queryFn: () => api.getAllOrders(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval
  });
