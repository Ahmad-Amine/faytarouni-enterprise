import { useTranslation } from 'react-i18next';
import { useSiteSettings, useContentText } from '../hooks/useSiteSettings';
import { socialLink, openWhatsAppPopup, CONTACT_ICONS } from '../utils/whatsapp';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const tagline = useContentText(settings, 'footer_tagline', t('footer.tagline'), lang);
  const contacts = settings?.contacts || [];

  return (
    <footer className="site-footer">
      <div className="container">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt={settings.businessName} style={{ height: 30, margin: '0 auto' }} />
        ) : (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)' }}>
            {settings?.businessName || 'Faytarouni'}
          </p>
        )}
        <p style={{ marginTop: 6 }}>{tagline}</p>

        {contacts.length > 0 && (
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {contacts.map((c) =>
              c.type === 'whatsapp' ? (
                <button
                  key={c._id || c.value}
                  type="button"
                  onClick={() => openWhatsAppPopup(c.value)}
                  className="btn btn-outline btn-sm"
                  style={{ gap: 6 }}
                >
                  <span>{CONTACT_ICONS.whatsapp}</span>
                  {c.label || c.type}
                </button>
              ) : (
                <a
                  key={c._id || c.value}
                  href={socialLink(c)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ gap: 6 }}
                >
                  <span>{CONTACT_ICONS[c.type] || CONTACT_ICONS.other}</span>
                  {c.label || c.type}
                </a>
              )
            )}
          </div>
        )}

        <p style={{ marginTop: 14, fontSize: 12 }}>© {new Date().getFullYear()} {settings?.businessName || 'Faytarouni Barbershop'}</p>
      </div>
    </footer>
  );
}
