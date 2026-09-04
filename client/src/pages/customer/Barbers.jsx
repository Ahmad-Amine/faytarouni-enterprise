import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../../services/publicService';
import { useSiteSettings, useContentText } from '../../hooks/useSiteSettings';
import { Spinner } from '../../components/Feedback';

export default function Barbers() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const title = useContentText(settings, 'barbers_section_title', t('barbersPage.title'), lang);
  const { data: barbers, isLoading } = useQuery({ queryKey: ['barbers'], queryFn: catalogService.barbers });

  return (
    <div className="container" style={{ padding: '50px 24px' }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 32 }}>{title}</h1>
      {isLoading && <Spinner />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginTop: 24 }}>
        {barbers?.map((b) => (
          <Link key={b._id} to={`/barbers/${b._id}`} className="card" style={{ textAlign: 'center' }}>
            <img src={b.photoUrl} alt={b.name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--accent)', marginBottom: 12 }} />
            <h3>{b.name}</h3>
            {b.specialties?.length > 0 && <p style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4 }}>{b.specialties.join(' · ')}</p>}
            {b.stats?.ratingCount > 0 && (
              <p style={{ fontSize: 13, marginTop: 6 }}>★ {b.stats.averageRating.toFixed(1)} ({b.stats.ratingCount})</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
