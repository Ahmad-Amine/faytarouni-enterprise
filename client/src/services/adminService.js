import api from './apiClient';

export const adminAppointmentService = {
  list: (params) => api.get('/admin/appointments', { params }).then((r) => r.data),
  calendar: (month) => api.get('/admin/appointments/calendar', { params: { month } }).then((r) => r.data.data),
  stats: () => api.get('/admin/appointments/stats').then((r) => r.data.data),
  changeStatus: (id, payload) => api.patch(`/admin/appointments/${id}/status`, payload).then((r) => r.data.data),
  setPaymentStatus: (id, payload) => api.patch(`/admin/appointments/${id}/payment-status`, payload).then((r) => r.data.data),
  createWalkIn: (payload) => api.post('/admin/appointments/walk-in', payload).then((r) => r.data.data),
};

export const adminCustomerService = {
  list: (params) => api.get('/admin/customers', { params }).then((r) => r.data),
  getOne: (id) => api.get(`/admin/customers/${id}`).then((r) => r.data.data),
  setActive: (id, isActive) => api.patch(`/admin/customers/${id}/active`, { isActive }).then((r) => r.data.data),
  setPassword: (id, newPassword) => api.patch(`/admin/customers/${id}/password`, { newPassword }),
};

export const adminStaffService = {
  list: (params) => api.get('/admin/staff', { params }).then((r) => r.data),
  assignRole: (id, roleId) => api.patch(`/admin/staff/${id}/role`, { roleId }).then((r) => r.data.data),
  searchUsers: (search) => api.get('/admin/users/search', { params: { search, limit: 10 } }).then((r) => r.data),
  getBarberProfile: (userId) => api.get(`/admin/barbers/by-user/${userId}`).then((r) => r.data.data),
};

export const adminReviewService = {
  list: (params) => api.get('/admin/reviews', { params }).then((r) => r.data),
  setPublished: (id, isPublished) => api.patch(`/admin/reviews/${id}/publish`, { isPublished }).then((r) => r.data.data),
};

export const adminProductSaleService = {
  create: (payload) => api.post('/admin/product-sales', payload).then((r) => r.data.data),
};

export const adminScheduleService = {
  hours: (locationId) => api.get('/admin/schedule/hours', { params: { locationId } }).then((r) => r.data.data),
  upsertHours: (payload) => api.put('/admin/schedule/hours', payload).then((r) => r.data.data),
  holidays: (locationId) => api.get('/admin/schedule/holidays', { params: { locationId } }).then((r) => r.data.data),
  addHoliday: (payload) => api.post('/admin/schedule/holidays', payload).then((r) => r.data.data),
  removeHoliday: (id) => api.delete(`/admin/schedule/holidays/${id}`),
};

export const adminReportService = {
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data.data),
  revenue: (months) => api.get('/admin/reports/revenue', { params: { months } }).then((r) => r.data.data),
  productRevenue: (months) => api.get('/admin/reports/product-revenue', { params: { months } }).then((r) => r.data.data),
  totalRevenue: (months) => api.get('/admin/reports/total-revenue', { params: { months } }).then((r) => r.data.data),
  inventory: () => api.get('/admin/reports/inventory').then((r) => r.data.data),
};

export const adminSettingsService = {
  get: () => api.get('/admin/settings').then((r) => r.data.data),
  updateText: (payload) => api.put('/admin/settings/texts', payload).then((r) => r.data.data),
  updateRules: (payload) => api.put('/admin/settings/rules', payload).then((r) => r.data.data),
  updateContacts: (payload) => api.put('/admin/settings/contacts', payload).then((r) => r.data.data),
};

export const adminNotificationService = {
  list: (params) => api.get('/admin/notifications', { params }).then((r) => r.data),
  markRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch('/admin/notifications/read-all'),
};

export const adminAuditLogService = {
  list: (params) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
};

export const adminBackupService = {
  list: () => api.get('/admin/backups').then((r) => r.data.data),
  trigger: () => api.post('/admin/backups').then((r) => r.data.data),
  downloadUrl: (filename) => `/api/v1/admin/backups/${filename}/download`,
};

export const adminInventoryService = {
  lowStock: () => api.get('/admin/products/low-stock').then((r) => r.data.data),
  adjustStock: (id, delta) => api.patch(`/admin/products/${id}/stock`, { delta }).then((r) => r.data.data),
  markOrdered: (id) => api.patch(`/admin/purchase-orders/${id}/order`).then((r) => r.data.data),
  receive: (id) => api.patch(`/admin/purchase-orders/${id}/receive`).then((r) => r.data.data),
  cancelPO: (id) => api.patch(`/admin/purchase-orders/${id}/cancel`).then((r) => r.data.data),
};

export const adminRoleService = {
  permissions: () => api.get('/admin/permissions').then((r) => r.data.data),
};
