import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../queryKeys';

export const useSiteConfig = () =>
  useQuery({
    queryKey: queryKeys.siteConfig,
    queryFn: api.getSiteConfig
  });
