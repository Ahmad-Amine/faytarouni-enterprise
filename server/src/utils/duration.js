function durationToMs(value, fallbackMs) {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 1000;
  const match = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)\s*$/i.exec(String(value || ''));
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const units = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return Math.round(amount * units[match[2].toLowerCase()]);
}

module.exports = { durationToMs };
