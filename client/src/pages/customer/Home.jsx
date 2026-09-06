import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { catalogService } from "../../services/publicService";
import { useSiteSettings, useContentText } from "../../hooks/useSiteSettings";
import { Spinner } from "../../components/Feedback";
import {
  localizedBarberBio,
  localizedServiceDescription,
  localizedServiceName,
} from "../../utils/localizeCatalog";

const reveal = {
  initial: { opacity: 0, y: 34 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const { data: settings } = useSiteSettings();
  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: catalogService.barbers,
  });
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => catalogService.services(),
  });

  const heroTitle = useContentText(
    settings,
    "emerald_hero_title",
    lang === "ar" ? "كرسيك بانتظارك." : "Your chair is waiting.",
    lang,
  );
  const heroSubtitle = useContentText(
    settings,
    "emerald_hero_subtitle",
    lang === "ar"
      ? "حلاقة احترافية مع حجز أونلاين بسيط وسريع. اختر خدمتك، حلاقك والوقت المناسب خلال ثوانٍ."
      : "Expert grooming with effortless online booking. Choose your service, barber and preferred time in seconds.",
    lang,
  );
  const servicesTitle = useContentText(
    settings,
    "emerald_services_title",
    lang === "ar" ? "مصممة حول أسلوبك." : "Built around your style.",
    lang,
  );
  const barbersTitle = useContentText(
    settings,
    "emerald_barbers_title",
    lang === "ar" ? "اختر حلاقك." : "Choose your barber.",
    lang,
  );

  const topServices = services?.slice(0, 6) || [];
  const topBarbers = barbers?.slice(0, 6) || [];

  return (
    <main className="emerald-home">
      <section className="emerald-hero-section">
        <div className="container emerald-hero-grid">
          <motion.div
            className="emerald-hero-copy"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85 }}
          >
            <span className="emerald-tag">{t("home.premiumBarbering")}</span>
            <h1>{heroTitle}</h1>
            <p>{heroSubtitle}</p>
            <div className="emerald-hero-actions">
              <Link className="emerald-pill" to="/book">
                {t("nav.bookNow")} →
              </Link>
              <Link className="emerald-text-link" to="/barbers">
                {t("home.meetTeam")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="emerald-hero-image"
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.05, delay: 0.08 }}
          >
            <img src="/assets/image.png" alt={t("home.heroAlt")} />
            <div className="emerald-float-card">
              {t("home.onlineBooking")} · <strong>24/7</strong>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="emerald-marquee" aria-hidden="true">
        <div>
          {t("home.marqueePrecision")} <span>✦</span>{" "}
          {lang === "ar" ? "فيتاروني" : "FAYTAROUNI"} <span>✦</span>{" "}
          {t("home.marqueeHaircuts")} <span>✦</span> {t("home.marqueeBeard")}{" "}
          <span>✦</span> {t("home.marqueePrecision")} <span>✦</span>{" "}
          {lang === "ar" ? "فيتاروني" : "FAYTAROUNI"} <span>✦</span>{" "}
          {t("home.marqueeHaircuts")} <span>✦</span> {t("home.marqueeBeard")}{" "}
          <span>✦</span>
        </div>
      </div>

      <section className="container emerald-section" id="services">
        <motion.div {...reveal}>
          <span className="emerald-tag">{t("home.servicesTag")}</span>
          <h2>{servicesTitle}</h2>
        </motion.div>
        {!services ? (
          <Spinner />
        ) : (
          <div className="emerald-card-grid">
            {topServices.map((service, index) => (
              <motion.article
                className="emerald-card"
                key={service._id}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.04 }}
              >
                <small>
                  {service.durationMinutes || 0} {t("common.minutesShort")}
                </small>
                <h3>{localizedServiceName(service, lang)}</h3>
                <p>
                  {localizedServiceDescription(service, lang) ||
                    t("home.serviceFallback")}
                </p>
                <div className="emerald-price">
                  ${Number(service.price || 0).toFixed(2)}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <section
        className="container emerald-section emerald-team-section"
        id="team"
      >
        <motion.div {...reveal}>
          <span className="emerald-tag">{t("home.teamTag")}</span>
          <h2>{barbersTitle}</h2>
        </motion.div>
        {!barbers ? (
          <Spinner />
        ) : (
          <div className="emerald-card-grid">
            {topBarbers.map((barber, index) => (
              <motion.div
                key={barber._id}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.04 }}
              >
                <Link
                  to={`/barbers/${barber._id}`}
                  className="emerald-card emerald-barber-card"
                >
                  <div className="emerald-barber-photo">
                    {barber.photoUrl ? (
                      <img src={barber.photoUrl} alt={barber.name} />
                    ) : (
                      <span>✂</span>
                    )}
                  </div>
                  <small>
                    ★ {Number(barber?.stats?.averageRating || 5).toFixed(1)}
                  </small>
                  <h3>{barber.name}</h3>
                  <p>
                    {localizedBarberBio(barber, lang) ||
                      t("home.barberFallback")}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <motion.section className="container emerald-cta" {...reveal}>
        <div>
          <span className="emerald-tag">{t("home.onlineBooking")}</span>
          <h2>{t("home.nextCut")}</h2>
          <p>{t("home.registeredOnly")}</p>
        </div>
        <Link className="emerald-pill" to="/book">
          {t("nav.bookNow")} →
        </Link>
      </motion.section>
    </main>
  );
}
