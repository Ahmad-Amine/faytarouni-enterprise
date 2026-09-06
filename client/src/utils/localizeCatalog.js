const SERVICE_AR = {
  Haircut: 'قص شعر',
  'Beard Trim': 'تشذيب اللحية',
  'Hair Wash': 'غسيل الشعر',
  'Hair Coloring': 'صبغ الشعر',
  'Kids Haircut': 'قص شعر للأطفال',
  'VIP Service': 'خدمة VIP',
  'Custom Package': 'باقة مخصصة',
};

const BARBER_BIO_AR = {
  'Skin fades and classic cuts.': 'تدرجات احترافية وقصات كلاسيكية.',
  'Beard sculpting specialist.': 'متخصص في تحديد ونحت اللحية.',
  'Textured crops and modern styling.': 'قصات عصرية وتصفيف حديث.',
  "Great with kids' cuts and line-ups.": 'متميز في قصات الأطفال وتحديد الخطوط.',
};

const PRODUCT_AR = {
  'Matte Clay Pomade': 'بوماد طيني مطفي',
  'Beard Oil — Sandalwood': 'زيت لحية — خشب الصندل',
  'Sandalwood Aftershave': 'عطر ما بعد الحلاقة بخشب الصندل',
  'Precision Clippers': 'ماكينة حلاقة دقيقة',
};

export function localizedServiceName(service, lang) {
  if (lang !== 'ar') return service?.name || '';
  return service?.nameAr || SERVICE_AR[service?.name] || service?.name || '';
}

export function localizedServiceDescription(service, lang) {
  if (lang !== 'ar') return service?.description || '';
  return service?.descriptionAr || service?.description || '';
}

export function localizedBarberBio(barber, lang) {
  if (lang !== 'ar') return barber?.bio || '';
  return barber?.bioAr || BARBER_BIO_AR[barber?.bio] || barber?.bio || '';
}

export function localizedProductName(product, lang) {
  if (lang !== 'ar') return product?.name || '';
  return product?.nameAr || PRODUCT_AR[product?.name] || product?.name || '';
}

export function localizedProductDescription(product, lang) {
  if (lang !== 'ar') return product?.description || '';
  return product?.descriptionAr || product?.description || '';
}

export function countryName(code, fallback, lang) {
  try {
    const display = new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'region' });
    return display.of(code) || fallback;
  } catch {
    return fallback;
  }
}
