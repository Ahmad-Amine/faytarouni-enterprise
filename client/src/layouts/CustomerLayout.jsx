import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const routeThemes = [
  ['book', 'cobalt'],
  ['barbers', 'emerald'],
  ['shop', 'warm'],
  ['login', 'noir'],
  ['register', 'burgundy'],
  ['profile', 'chrome'],
  ['my-appointments', 'cobalt'],
  ['forgot-password', 'warm'],
  ['reset-password', 'burgundy'],
  ['verify-email', 'emerald'],
];

export default function CustomerLayout() {
  const location = useLocation();
  const theme = location.pathname === '/'
    ? 'wave'
    : (routeThemes.find(([segment]) => location.pathname.includes(segment))?.[1] || 'noir');

  return (
    <div className={`customer-experience theme-${theme}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main className="customer-main" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
