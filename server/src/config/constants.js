const PERMISSIONS = Object.freeze({
  APPOINTMENTS_VIEW_ALL: 'appointments:view_all',
  APPOINTMENTS_MANAGE: 'appointments:manage',
  WALKINS_CREATE: 'walkins:create',

  SCHEDULE_MANAGE: 'schedule:manage',

  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_MANAGE: 'customers:manage',

  STAFF_MANAGE: 'staff:manage',

  SERVICES_MANAGE: 'services:manage',
  CATEGORIES_MANAGE: 'categories:manage',

  PRODUCTS_MANAGE: 'products:manage',
  SUPPLIERS_MANAGE: 'suppliers:manage',
  PURCHASE_ORDERS_MANAGE: 'purchase_orders:manage',

  COUPONS_MANAGE: 'coupons:manage',
  TAXES_MANAGE: 'taxes:manage',
  LOCATIONS_MANAGE: 'locations:manage',
  PAYMENTS_TAKE_CASH: 'payments:take_cash',

  REPORTS_VIEW: 'reports:view',

  ROLES_MANAGE: 'roles:manage',
  SETTINGS_MANAGE: 'settings:manage',
  EMAIL_TEMPLATES_MANAGE: 'email_templates:manage',
  WHATSAPP_TEMPLATES_MANAGE: 'whatsapp_templates:manage',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
  BACKUPS_MANAGE: 'backups:manage',
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const DEFAULT_ROLES = [
  { name: 'customer', permissions: [] },
  { name: 'admin', permissions: ALL_PERMISSIONS },
  {
    name: 'manager',
    permissions: [
      PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_MANAGE,
      PERMISSIONS.WALKINS_CREATE,
      PERMISSIONS.SCHEDULE_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.SERVICES_MANAGE,
      PERMISSIONS.CATEGORIES_MANAGE,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.PAYMENTS_TAKE_CASH,
      PERMISSIONS.WHATSAPP_TEMPLATES_MANAGE,
    ],
  },
  {
    name: 'barber',
    permissions: [PERMISSIONS.APPOINTMENTS_VIEW_ALL, PERMISSIONS.APPOINTMENTS_MANAGE, PERMISSIONS.WHATSAPP_TEMPLATES_MANAGE],
  },
];

const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
});

const APPOINTMENT_SOURCE = Object.freeze({
  ONLINE: 'online',
  WALK_IN: 'walk_in',
  ADMIN: 'admin',
});

const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  CARD: 'card',
  UNPAID: 'unpaid',
});

const PURCHASE_ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  ORDERED: 'ordered',
  RECEIVED: 'received',
  CANCELED: 'canceled',
});

const COUPON_TYPE = Object.freeze({
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
});

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  APPOINTMENT_STATUS,
  APPOINTMENT_SOURCE,
  PAYMENT_METHOD,
  PURCHASE_ORDER_STATUS,
  COUPON_TYPE,
};
