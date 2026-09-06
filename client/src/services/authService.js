import api from './apiClient';

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data.data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me').then((r) => r.data.data),
  updateProfile: (payload) => api.patch('/auth/profile', payload).then((r) => r.data.data),
  updatePassword: (payload) => api.patch('/auth/password', payload),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};
