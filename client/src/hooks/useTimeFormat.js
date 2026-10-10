import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from './useSiteSettings';
import { formatTime } from '../utils/timeFormat';

// Returns a formatter bound to the admin-chosen time format and current language.
export function useTimeFormat() {
  const { data: settings } = useSiteSettings();
  const { i18n } = useTranslation();
  const format = settings?.timeFormat || '24h';
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  return useCallback((hhmm) => formatTime(hhmm, format, lang), [format, lang]);
}
