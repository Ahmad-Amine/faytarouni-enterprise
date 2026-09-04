import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthInitialize } from './hooks/useAuth';
import { useSiteSettings } from './hooks/useSiteSettings';
import { darken } from './utils/color';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { Routes, Route } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './components/RouteGuards';
import { PERMISSIONS } from './utils/permissions';

import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/customer/Home';
import Booking from './pages/customer/Booking';
import Barbers from './pages/customer/Barbers';
import BarberProfile from './pages/customer/BarberProfile';
import Shop from './pages/customer/Shop';
import Login from './pages/customer/Login';
import Register from './pages/customer/Register';
import ForgotPassword from './pages/customer/ForgotPassword';
import ResetPassword from './pages/customer/ResetPassword';
import VerifyEmail from './pages/customer/VerifyEmail';
import Profile from './pages/customer/Profile';
import MyAppointments from './pages/customer/MyAppointments';
import NotFound from './pages/customer/NotFound';

import AdminHome from './pages/admin/AdminHome';
import AdminAppointments from './pages/admin/AdminAppointments';
import WalkIns from './pages/admin/WalkIns';
import Schedule from './pages/admin/Schedule';
import Customers from './pages/admin/Customers';
import CustomerDetail from './pages/admin/CustomerDetail';
import Staff from './pages/admin/Staff';
import Reviews from './pages/admin/Reviews';
import Catalog from './pages/admin/Catalog';
import Products from './pages/admin/Products';
import Suppliers from './pages/admin/Suppliers';
import PurchaseOrders from './pages/admin/PurchaseOrders';
import Coupons from './pages/admin/Coupons';
import Taxes from './pages/admin/Taxes';
import Locations from './pages/admin/Locations';
import Reports from './pages/admin/Reports';
import Roles from './pages/admin/Roles';
import Settings from './pages/admin/Settings';
import EmailTemplates from './pages/admin/EmailTemplates';
import WhatsAppTemplates from './pages/admin/WhatsAppTemplates';
import AuditLogs from './pages/admin/AuditLogs';
import Backups from './pages/admin/Backups';

export default function App() {
  useAuthInitialize();
  const { i18n } = useTranslation();
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    const color = settings?.theme?.primaryColor;
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-deep', darken(color));
  }, [settings]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Booking />} />
          <Route path="/barbers" element={<Barbers />} />
          <Route path="/barbers/:id" element={<BarberProfile />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/my-appointments" element={<RequireAuth><MyAppointments /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminHome />} />
          <Route path="appointments" element={<RequirePermission permission={PERMISSIONS.APPOINTMENTS_VIEW_ALL}><AdminAppointments /></RequirePermission>} />
          <Route path="walk-ins" element={<RequirePermission permission={PERMISSIONS.WALKINS_CREATE}><WalkIns /></RequirePermission>} />
          <Route path="schedule" element={<RequirePermission permission={PERMISSIONS.SCHEDULE_MANAGE}><Schedule /></RequirePermission>} />
          <Route path="customers" element={<RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}><Customers /></RequirePermission>} />
          <Route path="customers/:id" element={<RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}><CustomerDetail /></RequirePermission>} />
          <Route path="staff" element={<RequirePermission permission={PERMISSIONS.STAFF_MANAGE}><Staff /></RequirePermission>} />
          <Route path="reviews" element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW}><Reviews /></RequirePermission>} />
          <Route path="catalog" element={<RequirePermission permission={PERMISSIONS.CATEGORIES_MANAGE}><Catalog /></RequirePermission>} />
          <Route path="products" element={<RequirePermission permission={PERMISSIONS.PRODUCTS_MANAGE}><Products /></RequirePermission>} />
          <Route path="suppliers" element={<RequirePermission permission={PERMISSIONS.SUPPLIERS_MANAGE}><Suppliers /></RequirePermission>} />
          <Route path="purchase-orders" element={<RequirePermission permission={PERMISSIONS.PURCHASE_ORDERS_MANAGE}><PurchaseOrders /></RequirePermission>} />
          <Route path="coupons" element={<RequirePermission permission={PERMISSIONS.COUPONS_MANAGE}><Coupons /></RequirePermission>} />
          <Route path="taxes" element={<RequirePermission permission={PERMISSIONS.TAXES_MANAGE}><Taxes /></RequirePermission>} />
          <Route path="locations" element={<RequirePermission permission={PERMISSIONS.LOCATIONS_MANAGE}><Locations /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW}><Reports /></RequirePermission>} />
          <Route path="roles" element={<RequirePermission permission={PERMISSIONS.ROLES_MANAGE}><Roles /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}><Settings /></RequirePermission>} />
          <Route path="email-templates" element={<RequirePermission permission={PERMISSIONS.EMAIL_TEMPLATES_MANAGE}><EmailTemplates /></RequirePermission>} />
          <Route path="whatsapp-templates" element={<RequirePermission permission={PERMISSIONS.WHATSAPP_TEMPLATES_MANAGE}><WhatsAppTemplates /></RequirePermission>} />
          <Route path="audit-logs" element={<RequirePermission permission={PERMISSIONS.AUDIT_LOGS_VIEW}><AuditLogs /></RequirePermission>} />
          <Route path="backups" element={<RequirePermission permission={PERMISSIONS.BACKUPS_MANAGE}><Backups /></RequirePermission>} />
        </Route>
      </Routes>
      <ToastContainer />
    </ErrorBoundary>
  );
}
