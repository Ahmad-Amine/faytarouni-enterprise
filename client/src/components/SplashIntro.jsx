import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SplashIntro({ onDone }) {
  const { i18n } = useTranslation();
  const [leaving, setLeaving] = useState(false);
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 2850);
    const doneTimer = window.setTimeout(() => onDone?.(), 3650);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <section className={`opening-splash${leaving ? ' is-leaving' : ''}`} aria-label={isArabic ? 'شاشة افتتاح صالون فيتاروني' : 'Faytarouni Barbershop opening screen'}>
      <div className="opening-brand">
        <div className="opening-emblem" aria-hidden="true">
          <div className="opening-halo" />
          <div className="opening-outer-ring" />
          <div className="opening-mid-ring" />
          <div className="opening-inner-ring" />
          <div className="opening-barber-spiral" />
          <div className="opening-blade opening-blade-one" />
          <div className="opening-blade opening-blade-two" />
          <div className="opening-ring-text">
            <svg viewBox="0 0 230 230">
              <defs>
                <path id="openingCirclePath" d="M115,115 m-96,0 a96,96 0 1,1 192,0 a96,96 0 1,1 -192,0" />
              </defs>
              <text>
                <textPath href="#openingCirclePath" startOffset="3%">
                  {isArabic ? 'فيتروني • للحلاقة • فيتروني • للحلاقة •' : 'FAYTAROUNI • BARBERSHOP • FAYTAROUNI • BARBERSHOP •'}
                </textPath>
              </text>
            </svg>
          </div>
          <div className="opening-center-disc">{isArabic ? 'ف' : 'FB'}</div>
        </div>

        <p className="opening-eyebrow">{isArabic ? 'فيتروني' : 'FAYTAROUNI'}</p>
        <h1 className="opening-title">
          {isArabic ? 'فيتروني ' : 'Faytarouni '}
          <span>{isArabic ? 'للحلاقة' : 'Barbershop'}</span>
        </h1>
        <p className="opening-tagline">{isArabic ? 'حرفية كلاسيكية. دقة عصرية.' : 'Classic craft. Modern precision.'}</p>
        <div className="opening-loading" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
