import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { useSocket } from '../hooks/useSocket';
import { adminNotificationService } from '../services/adminService';
import { PERMISSIONS } from '../utils/permissions';
import WhatsAppButton from '../components/WhatsAppButton';

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', end: true, permission: PERMISSIONS.REPORTS_VIEW }],
  },
  {
    label: 'Bookings',
    items: [
      { to: '/admin/appointments', label: 'Appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW_ALL },
      { to: '/admin/walk-ins', label: 'Walk-ins', permission: PERMISSIONS.WALKINS_CREATE },
      { to: '/admin/schedule', label: 'Schedule', permission: PERMISSIONS.SCHEDULE_MANAGE },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/customers', label: 'Customers', permission: PERMISSIONS.CUSTOMERS_VIEW },
      { to: '/admin/staff', label: 'Staff', permission: PERMISSIONS.STAFF_MANAGE },
      { to: '/admin/reviews', label: 'Reviews', permission: PERMISSIONS.REPORTS_VIEW },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/catalog', label: 'Categories & Services', permission: PERMISSIONS.CATEGORIES_MANAGE },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/admin/products', label: 'Products', permission: PERMISSIONS.PRODUCTS_MANAGE },
      { to: '/admin/suppliers', label: 'Suppliers', permission: PERMISSIONS.SUPPLIERS_MANAGE },
      { to: '/admin/purchase-orders', label: 'Purchase Orders', permission: PERMISSIONS.PURCHASE_ORDERS_MANAGE },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/admin/coupons', label: 'Coupons', permission: PERMISSIONS.COUPONS_MANAGE },
      { to: '/admin/taxes', label: 'Taxes', permission: PERMISSIONS.TAXES_MANAGE },
      { to: '/admin/locations', label: 'Locations', permission: PERMISSIONS.LOCATIONS_MANAGE },
    ],
  },
  {
    label: 'Reports',
    items: [{ to: '/admin/reports', label: 'Revenue & Analytics', permission: PERMISSIONS.REPORTS_VIEW }],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/roles', label: 'Roles & Permissions', permission: PERMISSIONS.ROLES_MANAGE },
      { to: '/admin/settings', label: 'Settings', permission: PERMISSIONS.SETTINGS_MANAGE },
      { to: '/admin/email-templates', label: 'Email Templates', permission: PERMISSIONS.EMAIL_TEMPLATES_MANAGE },
      { to: '/admin/whatsapp-templates', label: 'WhatsApp Templates', permission: PERMISSIONS.WHATSAPP_TEMPLATES_MANAGE },
      { to: '/admin/audit-logs', label: 'Audit Logs', permission: PERMISSIONS.AUDIT_LOGS_VIEW },
      { to: '/admin/backups', label: 'Backups', permission: PERMISSIONS.BACKUPS_MANAGE },
    ],
  },
];

function NavItem({ item, onNavigate }) {
  const allowed = usePermission(item.permission);
  if (!allowed) return null;
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} onClick={onNavigate}>
      {item.label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminNotificationService.list({ limit: 8 }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!bellOpen) return undefined;
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  useSocket(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
  });

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const notifications = data?.data || [];
  const unreadCount = data?.meta?.unreadCount || 0;

  const markAllRead = async () => {
    await adminNotificationService.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
  };

  return (
    <div className="admin-shell">
      {mobileNavOpen && <div className="admin-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`admin-sidebar${mobileNavOpen ? ' open' : ''}`}>
        <Link to="/" className="brand" style={{ display: 'block' }}>Faytarouni</Link>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="admin-nav-group">{group.label}</div>
            {group.items.map((item) => (
              <NavItem key={item.to} item={item} onNavigate={() => setMobileNavOpen(false)} />
            ))}
          </div>
        ))}
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <button
            type="button"
            className="btn btn-icon btn-outline mobile-menu-btn"
            style={{ marginInlineEnd: 'auto' }}
            aria-label="Menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
          <div style={{ position: 'relative' }} ref={bellRef}>
            <button type="button" className="btn btn-icon btn-outline" onClick={() => setBellOpen((o) => !o)} aria-label="Notifications">
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: 'var(--danger)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="card admin-notification-popover">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong>Notifications</strong>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                </div>
                {notifications.length === 0 && <p style={{ fontSize: 13, color: 'var(--brown-soft)' }}>No notifications yet.</p>}
                {notifications.map((n) => (
                  <div key={n._id} style={{ padding: '8px 0', borderTop: '1px solid #ecdfc2', fontSize: 13 }}>
                    <p>{n.message}</p>
                    {n.type === 'loyalty_gift' && n.user?.phone && (
                      <WhatsAppButton
                        phone={n.user.phone}
                        vars={{ name: n.user.name }}
                        fallbackMessage={`Hi ${n.user.name}, thank you for being such a loyal customer! As a small thank-you from us, you have a gift waiting for you on your next visit.`}
                        label="🎁 WhatsApp"
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
