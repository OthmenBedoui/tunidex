import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useSeoAnalytics = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.seoAnalytics,
    queryFn: api.getSeoAnalytics,
    enabled
  });
