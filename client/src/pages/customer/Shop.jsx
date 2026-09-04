import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../../services/publicService';
import { useSiteSettings, useContentText } from '../../hooks/useSiteSettings';
import { Spinner } from '../../components/Feedback';

export default function Shop() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const title = useContentText(settings, 'shop_page_title', t('shop.title'), lang);
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: catalogService.products });
  const products = data?.data || data || [];

  return (
    <div className="container" style={{ padding: '50px 24px' }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 32 }}>{title}</h1>
      {isLoading && <Spinner />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18, marginTop: 24 }}>
        {products.map((p) => (
          <div key={p._id} className="card">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: 1, borderRadius: 10, marginBottom: 10, background: 'var(--mustard-soft)' }} />
            )}
            <h3 style={{ fontSize: 15 }}>{p.name}</h3>
            {p.description && <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 }}>{p.description}</p>}
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 6 }}>${p.price.toFixed(2)}</p>
            <p style={{ fontSize: 12, color: p.stock > 0 ? 'var(--teal)' : 'var(--danger)', marginTop: 4 }}>
              {p.stock > 0 ? t('shop.inStock', { count: p.stock }) : t('shop.outOfStock')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
