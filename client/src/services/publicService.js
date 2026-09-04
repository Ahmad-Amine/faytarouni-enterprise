import api from './apiClient';

export const catalogService = {
  categories: () => api.get('/categories').then((r) => r.data.data),
  services: (categoryId) => api.get('/services', { params: { category: categoryId } }).then((r) => r.data.data),
  barbers: () => api.get('/barbers').then((r) => r.data.data),
  barber: (id) => api.get(`/barbers/${id}`).then((r) => r.data.data),
  barberReviews: (id) => api.get(`/barbers/${id}/reviews`).then((r) => r.data.data),
  products: () => api.get('/products').then((r) => r.data.data),
  settings: () => api.get('/settings').then((r) => r.data.data),
};

export const bookingService = {
  monthAvailability: (month) => api.get('/availability', { params: { month } }).then((r) => r.data.data),
  daySlots: (date, duration) => api.get(`/availability/${date}`, { params: { duration } }).then((r) => r.data.data),
  availableBarbers: (date, time, duration) =>
    api.get(`/availability/${date}/${time}/barbers`, { params: { duration } }).then((r) => r.data.data),
  createAppointment: (payload) => api.post('/appointments', payload).then((r) => r.data.data),
  myAppointments: () => api.get('/my-appointments').then((r) => r.data.data),
  cancelAppointment: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.data),
  rescheduleAppointment: (id, payload) =>
    api.patch(`/appointments/${id}/reschedule`, payload).then((r) => r.data.data),
  leaveReview: (payload) => api.post('/reviews', payload).then((r) => r.data.data),
};

export const notificationService = {
  myNotifications: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
