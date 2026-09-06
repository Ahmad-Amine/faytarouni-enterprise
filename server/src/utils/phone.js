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

module.exports = { SUPPORTED_COUNTRY_DIALS, normalizePhone, getCountryDial, isSupportedE164 };
