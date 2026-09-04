import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const switchLang = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={switchLang}>
      {t('lang.switchTo')}
    </button>
  );
}
