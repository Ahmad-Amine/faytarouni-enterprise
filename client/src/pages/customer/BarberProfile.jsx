import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../../services/publicService';
import { Spinner } from '../../components/Feedback';
import {
  localizedBarberBio,
  localizedBarberName,
  localizedBarberSpecialties,
  localizedServiceName,
} from '../../utils/localizeCatalog';

export default function BarberProfile() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { id } = useParams();
  const { data: barber, isLoading } = useQuery({ queryKey: ['barber', id], queryFn: () => catalogService.barber(id) });
  const { data: reviews } = useQuery({ queryKey: ['barberReviews', id], queryFn: () => catalogService.barberReviews(id) });
  const reviewList = reviews || [];

  if (isLoading) return <Spinner />;
  if (!barber) return <p className="container">{t('notFound.barber')}</p>;

  const name = localizedBarberName(barber, lang);
  const specialties = localizedBarberSpecialties(barber, lang);
  // Only the services the admin assigned to this barber (the API already
  // drops inactive ones).
  const barberServices = (barber.services || []).filter((s) => s && typeof s === 'object');

  return (
    <div className="container" style={{ padding: '50px 24px', maxWidth: 760 }}>
      <div className="profile-hero">
        <div className="profile-avatar">{barber.photoUrl ? <img src={barber.photoUrl} alt={name} /> : <span>✂</span>}</div>
        <div>
          <h1 style={{ color: 'var(--accent)', fontSize: 32 }}>{name}</h1>
          {barber.stats?.ratingCount > 0 && (
            <p>★ {barber.stats.averageRating.toFixed(1)} · {t('reviews.count', { count: barber.stats.ratingCount })}</p>
          )}
          {specialties.length > 0 && <p style={{ color: 'var(--teal)', marginTop: 4 }}>{specialties.join(' · ')}</p>}
          <p style={{ marginTop: 10, color: 'var(--brown-soft)' }}>{localizedBarberBio(barber, lang)}</p>
          {barberServices.length > 0 && (
            <Link to={`/book?barber=${barber._id}`} className="btn btn-primary" style={{ marginTop: 16 }}>
              {t('barbersPage.bookWith', { name })}
            </Link>
          )}
        </div>
      </div>

      <h2 style={{ marginTop: 40, fontSize: 24 }}>{t('barbersPage.services')}</h2>
      {barberServices.length === 0 ? (
        <p style={{ color: 'var(--brown-soft)', marginTop: 12 }}>{t('barbersPage.noServices')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {barberServices.map((s) => (
            <div key={s._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span>
                {localizedServiceName(s, lang)}{' '}
                <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
                  ({s.durationMinutes} {t('common.minutesShort')})
                </span>
              </span>
              <strong style={{ color: 'var(--accent)' }}>${Number(s.price || 0).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 40, fontSize: 24 }}>
        {t('reviews.title')}
        {reviewList.length > 0 ? ` (${reviewList.length})` : ''}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {reviewList.length ? (
          reviewList.map((r) => (
            <div key={r._id} className="card">
              <p style={{ fontWeight: 700 }}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)} — {r.customer?.name}
              </p>
              {r.comment && <p style={{ marginTop: 6, fontSize: 14 }}>{r.comment}</p>}
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--brown-soft)' }}>{t('reviews.none')}</p>
        )}
      </div>
    </div>
  );
}
