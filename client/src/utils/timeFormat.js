// Times are stored and sent to the API as 24h "HH:MM"; this only changes
// how they are shown. format: '12h' | '24h' (from site settings).
export function formatTime(hhmm, format = '24h', lang = 'en') {
  if (!hhmm || format !== '12h') return hhmm || '';
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const isPm = h >= 12;
  const suffix = lang === 'ar' ? (isPm ? 'م' : 'ص') : isPm ? 'PM' : 'AM';
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}
