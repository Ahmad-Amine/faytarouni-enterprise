import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../../services/publicService';
import { useSiteSettings, useContentText } from '../../hooks/useSiteSettings';
import { Spinner } from '../../components/Feedback';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const { data: barbers } = useQuery({ queryKey: ['barbers'], queryFn: catalogService.barbers });
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: () => catalogService.services() });

  const heroTitle = useContentText(
    settings,
    'hero_title',
    lang === 'ar' ? 'أكثر من مجرد قصة' : 'More than a cut',
    lang
  );
  const heroSubtitle = useContentText(
    settings,
    'hero_subtitle',
    lang === 'ar'
      ? 'حرفية كلاسيكية، أسلوب عصري، وتجربة حجز سهلة من أي جهاز.'
      : 'Classic craft, modern style, and effortless booking from any device.',
    lang
  );
  const ctaPrimary = useContentText(settings, 'hero_cta_primary', t('home.heroCta'), lang);
  const ctaSecondary = useContentText(settings, 'hero_cta_secondary', t('home.heroSecondary'), lang);
  const barbersTitle = useContentText(settings, 'barbers_section_title', t('home.barbersTitle'), lang);
  const servicesTitle = useContentText(settings, 'services_section_title', t('home.servicesTitle'), lang);

  const topServices = services?.slice(0, 6) || [];
  const topBarbers = barbers?.slice(0, 4) || [];

  return (
    <div className="wave-home">
      <section className="wave-section wave-hero wave-noir angle-bottom-right">
        <div className="wave-orb wave-orb-gold" />
        <div className="container wave-hero-grid">
          <motion.div
            className="wave-hero-copy"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="wave-kicker">{lang === 'ar' ? 'حلاقة عصرية بمستوى احترافي' : 'Premium modern barbering'}</span>
            <h1>{heroTitle}</h1>
            <p>{heroSubtitle}</p>
            <div className="wave-actions">
              <Link to="/book" className="btn wave-btn-gold">{ctaPrimary}</Link>
              <Link to="/barbers" className="btn wave-btn-ghost">{ctaSecondary}</Link>
            </div>
            <div className="wave-stats">
              <span><strong>4.9★</strong>{lang === 'ar' ? 'تقييم العملاء' : 'Customer rating'}</span>
              <span><strong>24/7</strong>{lang === 'ar' ? 'حجز أونلاين' : 'Online booking'}</span>
              <span><strong>100%</strong>{lang === 'ar' ? 'متجاوب' : 'Responsive'}</span>
            </div>
          </motion.div>
          <motion.div
            className="wave-hero-art"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.1 }}
          >
            <img src="/assets/photo-1503951914875-452162b0f3f1" alt={lang === 'ar' ? 'تصميم صالون فيطروني' : 'Faytarouni barbershop'} />
            <div className="wave-floating-card">
              <span>{lang === 'ar' ? 'الموعد التالي' : 'Next available'}</span>
              <strong>{lang === 'ar' ? 'اليوم · 6:30 مساءً' : 'Today · 6:30 PM'}</strong>
            </div>
          </motion.div>
        </div>
        <div className="wave-marquee" aria-hidden="true">
          <div>FAYTAROUNI ✦ PRECISION ✦ STYLE ✦ BARBERING ✦ FAYTAROUNI ✦ PRECISION ✦ STYLE ✦ BARBERING ✦</div>
        </div>
      </section>

      <section className="wave-section wave-cream angle-top-left" id="services">
        <div className="container wave-content">
          <motion.div className="wave-section-head" {...reveal}>
            <span>{lang === 'ar' ? 'خدماتنا' : 'Our services'}</span>
            <h2>{servicesTitle}</h2>
            <p>{lang === 'ar' ? 'أسعار واضحة، توقيت واضح، وحجز أسرع.' : 'Clear pricing, clear timing, and a faster way to book.'}</p>
          </motion.div>
          {!services ? <Spinner /> : (
            <div className="wave-service-grid">
              {topServices.map((service, index) => (
                <motion.article className="wave-service-card" key={service._id} {...reveal} transition={{ ...reveal.transition, delay: index * 0.05 }}>
                  <span className="wave-service-index">0{index + 1}</span>
                  <div>
                    <h3>{service.name}</h3>
                    <p>{service.durationMinutes ? `${service.durationMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}` : ''}</p>
                  </div>
                  <strong>${Number(service.price || 0).toFixed(2)}</strong>
                </motion.article>
              ))}
            </div>
          )}
          <motion.div className="wave-center-action" {...reveal}>
            <Link to="/book" className="btn btn-primary">{lang === 'ar' ? 'ابدأ الحجز' : 'Start booking'}</Link>
          </motion.div>
        </div>
      </section>

      <section className="wave-section wave-emerald angle-top-right" id="barbers">
        <div className="wave-orb wave-orb-green" />
        <div className="container wave-content">
          <motion.div className="wave-section-head wave-section-head-light" {...reveal}>
            <span>{lang === 'ar' ? 'الفريق' : 'The team'}</span>
            <h2>{barbersTitle}</h2>
            <p>{lang === 'ar' ? 'اختر الحلاق الذي يناسب أسلوبك ثم احجز وقته المتاح.' : 'Choose the barber that fits your style, then book their available time.'}</p>
          </motion.div>
          {!barbers ? <Spinner /> : (
            <div className="wave-barber-grid">
              {topBarbers.map((barber, index) => (
                <motion.div key={barber._id} {...reveal} transition={{ ...reveal.transition, delay: index * 0.06 }}>
                  <Link to={`/barbers/${barber._id}`} className="wave-barber-card">
                    <div className="wave-barber-photo">
                      {barber.photoUrl ? <img src={barber.photoUrl} alt={barber.name} /> : <div className="wave-photo-fallback">✂</div>}
                    </div>
                    <div>
                      <h3>{barber.name}</h3>
                      <span>{lang === 'ar' ? 'عرض الملف والحجز ←' : 'View profile & book →'}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="wave-section wave-cobalt angle-bottom-left">
        <div className="container wave-booking-grid">
          <motion.div {...reveal}>
            <span className="wave-kicker">{lang === 'ar' ? 'حجز سريع' : 'Fast booking'}</span>
            <h2>{lang === 'ar' ? 'ثلاث خطوات، وموعدك جاهز.' : 'Three steps. You’re booked.'}</h2>
            <p>{lang === 'ar' ? 'اختر الخدمة، الحلاق، والوقت. كل المنطق الحالي للحجز يبقى كما هو.' : 'Pick a service, barber and time. Your existing booking logic stays exactly where it belongs.'}</p>
            <Link to="/book" className="btn wave-btn-gold">{lang === 'ar' ? 'احجز موعدك' : 'Book your appointment'}</Link>
          </motion.div>
          <motion.div className="wave-booking-card" {...reveal}>
            <div><span>01</span><strong>{lang === 'ar' ? 'اختر الخدمة' : 'Choose service'}</strong><em>{lang === 'ar' ? 'قصة شعر' : 'Haircut'}</em></div>
            <div><span>02</span><strong>{lang === 'ar' ? 'اختر الحلاق' : 'Select barber'}</strong><em>{lang === 'ar' ? 'متاح' : 'Available'}</em></div>
            <div><span>03</span><strong>{lang === 'ar' ? 'اختر الوقت' : 'Pick a time'}</strong><em>18:30</em></div>
          </motion.div>
        </div>
      </section>

      <section className="wave-section wave-burgundy angle-top-left">
        <div className="container wave-gallery-grid">
          <motion.div className="wave-gallery-copy" {...reveal}>
            <span className="wave-kicker">{lang === 'ar' ? 'التجربة' : 'The experience'}</span>
            <h2>{lang === 'ar' ? 'أسلوب يتغير مع الصفحة، لا مع الوظيفة.' : 'A look that changes. Functionality that doesn’t.'}</h2>
            <p>{lang === 'ar' ? 'الموجات والزوايا والألوان تتحول بسلاسة بينما تبقى الحسابات والحجز والإشعارات آمنة ومستقرة.' : 'Waves, angles and colors morph smoothly while accounts, booking and notifications stay stable and secure.'}</p>
          </motion.div>
          <motion.div className="wave-gallery-art" {...reveal}>
            <img src="/assets/photo-1503951914875-452162b0f3f1" alt={lang === 'ar' ? 'معاينة تصميم فيطروني' : 'Faytarouni design showcase'} />
          </motion.div>
        </div>
      </section>

      <section className="wave-section wave-soft angle-bottom-right">
        <div className="container wave-final-cta">
          <motion.div {...reveal}>
            <span className="wave-kicker">{lang === 'ar' ? 'جاهز؟' : 'Ready?'}</span>
            <h2>{lang === 'ar' ? 'مظهرك القادم يبدأ من هنا.' : 'Your next look starts here.'}</h2>
          </motion.div>
          <motion.div {...reveal}>
            <Link to="/book" className="btn btn-primary">{ctaPrimary}</Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
