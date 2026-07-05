import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useAdminStats = (enabled: boolean, reloadKey = 0) =>
  useQuery({
    queryKey: [...queryKeys.adminStats, reloadKey],
    queryFn: api.getDailyStats,
    enabled
  });
