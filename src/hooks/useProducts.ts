import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useProducts = () =>
  useQuery({
    queryKey: queryKeys.productsCatalog,
    queryFn: api.getListings
  });
