import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useCart = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.cart,
    queryFn: api.getCart,
    enabled
  });
