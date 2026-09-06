import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CustomerLayout() {
  return (
    <div className="customer-experience theme-emerald" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Navbar />
      <main className="customer-main" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
