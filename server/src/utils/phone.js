const env = require('../config/env');

const SUPPORTED_COUNTRY_DIALS = [
  '+961', '+1', '+44', '+33', '+49', '+357', '+90', '+962', '+963', '+964', '+20', '+966', '+971', '+974', '+965', '+973', '+968', '+61',
].sort((a, b) => b.length - a.length);

function normalizePhone(value) {
  return String(value || '').trim().replace(/[\s().-]/g, '');
}

function getCountryDial(value) {
  const phone = normalizePhone(value);
  return SUPPORTED_COUNTRY_DIALS.find((dial) => phone.startsWith(dial)) || null;
}

function isSupportedE164(value) {
  const phone = normalizePhone(value);
  return /^\+[1-9]\d{7,14}$/.test(phone) && Boolean(getCountryDial(phone));
}

// WhatsApp identifies contacts by the full international number as digits.
// Older walk-in records may be stored in local form (03 123 456), so those
// fall back to the shop's country.
function toWaId(value, defaultDial = env.whatsapp.defaultCountryDial) {
  const phone = normalizePhone(value);
  if (!/^\+?\d+$/.test(phone)) return null;

  let digits;
  if (phone.startsWith('+')) digits = phone.slice(1);
  else if (phone.startsWith('00')) digits = phone.slice(2);
  else if (phone.startsWith('0') || phone.length <= 8) digits = `${defaultDial}${phone.replace(/^0/, '')}`;
  else digits = phone;

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

module.exports = { SUPPORTED_COUNTRY_DIALS, normalizePhone, getCountryDial, isSupportedE164, toWaId };
