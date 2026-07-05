import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AdminUsersQueryParams } from '../../types';
import { queryKeys } from '../queryKeys';

export const useAdminUsersPage = (
  params: AdminUsersQueryParams,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: queryKeys.adminUsersPage(params),
    queryFn: () => api.getAllUsers(params),
    enabled: options?.enabled ?? true
  });
