import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useAdminUsers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async () => (await api.getAllUsers({ limit: 100, sort: 'newest' })).items,
    enabled
  });
