import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/publicService';

export function useSiteSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: catalogService.settings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContentText(settings, key, fallback, lang) {
  const entry = settings?.texts?.[key];
  const value = entry?.[lang];
  return value && value.trim() ? value : fallback;
}
