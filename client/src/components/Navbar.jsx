import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings, useContentText } from '../hooks/useSiteSettings';
import LanguageToggle from './LanguageToggle';

const linkClass = ({ isActive }) => (isActive ? 'active' : '');

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { user, isAuthenticated, logout, permissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useSiteSettings();
  const brandName = useContentText(settings, 'brand_name', settings?.businessName || 'Faytarouni', lang);

  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const showDashboardLink = permissions.length > 0;

  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass}>{t('nav.home')}</NavLink>
      <NavLink to="/book" className={linkClass}>{t('nav.book')}</NavLink>
      <NavLink to="/barbers" className={linkClass}>{t('nav.barbers')}</NavLink>
      <NavLink to="/shop" className={linkClass}>{t('nav.shop')}</NavLink>
      {isAuthenticated && <NavLink to="/my-appointments" className={linkClass}>{t('nav.myAppointments')}</NavLink>}
      {showDashboardLink && <NavLink to="/admin" className={linkClass}>{t('nav.dashboard')}</NavLink>}
    </>
  );

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container site-nav">
        <Link to="/" className="site-brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings?.logoUrl ? <img src={settings.logoUrl} alt={brandName} style={{ height: 34 }} /> : brandName}
        </Link>

        <nav className="site-links">{navLinks}</nav>

        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-icon btn-outline mobile-menu-btn"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
          <div className="nav-language-desktop"><LanguageToggle /></div>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="nav-user-name">{user?.name?.split(' ')[0]}</Link>
              <button
                type="button"
                className="btn btn-outline btn-sm nav-auth-desktop"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm nav-auth-desktop">{t('nav.signIn')}</Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <nav className="mobile-nav-panel">
          {navLinks}
          <div className="mobile-nav-tools">
            <LanguageToggle />
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="btn btn-outline btn-sm">{user?.name?.split(' ')[0]}</Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">{t('nav.signIn')}</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
