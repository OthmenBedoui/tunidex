import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.getCategories
  });
