export function darken(hex, amount = 0.18) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const scale = (channel) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount))));
  const r = scale((num >> 16) & 255);
  const g = scale((num >> 8) & 255);
  const b = scale(num & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
