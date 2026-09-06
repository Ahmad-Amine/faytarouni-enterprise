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

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const showDashboardLink = permissions.length > 0;
  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass}>{t('nav.home')}</NavLink>
      <NavLink to="/barbers" className={linkClass}>{t('nav.barbers')}</NavLink>
      <NavLink to="/shop" className={linkClass}>{t('nav.shop')}</NavLink>
      {isAuthenticated && <NavLink to="/my-appointments" className={linkClass}>{t('nav.myAppointments')}</NavLink>}
      {showDashboardLink && <NavLink to="/admin" className={linkClass}>{t('nav.dashboard')}</NavLink>}
    </>
  );

  return (
    <header className="site-header emerald-site-header" ref={headerRef}>
      <div className="container site-nav emerald-site-nav">
        <Link to="/" className="site-brand emerald-brand">
          {settings?.logoUrl ? <img src={settings.logoUrl} alt={brandName} /> : brandName}
        </Link>

        <nav className="site-links emerald-desktop-links">{navLinks}</nav>

        <div className="nav-actions emerald-nav-actions">
          <div className="nav-language-desktop"><LanguageToggle /></div>
          {isAuthenticated && <Link to="/profile" className="nav-user-name">{user?.name?.split(' ')[0]}</Link>}
          <button
            type="button"
            className="emerald-pill emerald-top-menu"
            aria-label={t('nav.menu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span>{t('nav.menu')}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="mobile-nav-panel emerald-mobile-panel">
          {navLinks}
          <div className="mobile-nav-tools emerald-mobile-tools">
            <LanguageToggle />
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="emerald-outline-pill">{user?.name?.split(' ')[0]}</Link>
                <button type="button" className="emerald-outline-pill" onClick={async () => { await logout(); navigate('/'); }}>{t('nav.signOut')}</button>
              </>
            ) : (
              <Link to="/login" className="emerald-outline-pill">{t('nav.signIn')}</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
