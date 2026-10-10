const Settings = require('../models/System').Settings;

const TIME_FORMATS = ['12h', '24h'];

// Formats an "HH:MM" string for display. Stored times always stay 24h
// "HH:MM" so comparisons/sorting keep working; only output is converted.
function formatTime(hhmm, format = '24h') {
  if (!hhmm || format !== '12h') return hhmm || '';
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

async function getTimeFormat() {
  const settings = await Settings.findOne({ singleton: 'main' }).select('timeFormat').lean();
  return TIME_FORMATS.includes(settings?.timeFormat) ? settings.timeFormat : '24h';
}

module.exports = { TIME_FORMATS, formatTime, getTimeFormat };
