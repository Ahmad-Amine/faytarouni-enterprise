import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const switchLang = () => i18n.changeLanguage(isArabic ? 'en' : 'ar');

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm language-code-toggle"
      onClick={switchLang}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {isArabic ? 'EN' : 'AR'}
    </button>
  );
}
