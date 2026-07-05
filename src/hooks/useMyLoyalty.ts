import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useMyLoyalty = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.loyalty.my,
    queryFn: api.getMyLoyalty,
    enabled,
    refetchInterval: enabled ? 30000 : false
  });
