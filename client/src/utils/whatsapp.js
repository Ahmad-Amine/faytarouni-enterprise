import { parsePhoneNumberFromString } from 'libphonenumber-js';

const DEFAULT_COUNTRY = 'LB';

export function whatsappLink(phone, message = '') {
  const raw = String(phone || '').trim();
  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  const digits = parsed?.isValid() ? parsed.number.replace('+', '') : raw.replace(/[^\d]/g, '').slice(0, 15);
  const text = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${digits}${text ? `&text=${text}` : ''}&type=phone_number&app_absent=0`;
}

export function openWhatsAppPopup(phone, message = '') {
  const url = whatsappLink(phone, message);
  const width = 420;
  const height = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  window.open(
    url,
    'whatsapp-popup',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
  );
}

export function interpolateTemplate(template, vars = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? vars[key] : ''));
}

export function socialLink(contact) {
  if (contact.type === "whatsapp") return whatsappLink(contact.value);
  if (contact.type === "phone") return `tel:${contact.value}`;
  if (contact.type === "email") return `mailto:${contact.value}`;
  return contact.value;
}

export const CONTACT_ICONS = {
  whatsapp: "📱",
  instagram: "📷",
  facebook: "👍",
  tiktok: "🎵",
  phone: "☎️",
  email: "✉️",
  other: "🔗",
};
