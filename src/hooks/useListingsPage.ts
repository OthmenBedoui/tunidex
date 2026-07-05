import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ListingsQueryParams } from '../../types';
import { queryKeys } from '../queryKeys';

export const useListingsPage = (
  params: ListingsQueryParams,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: queryKeys.productsPage(params),
    queryFn: () => api.getListingsPage(params),
    enabled: options?.enabled ?? true
  });
