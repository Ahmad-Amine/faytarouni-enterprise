import axios from 'axios';

const api = axios.create({
  // Always use the frontend origin. In production the frontend Node server
  // proxies /api to the Railway backend, keeping auth/CSRF cookies first-party
  // for Safari/iOS while preserving the backend as a separate service.
  baseURL: '/api/v1',
  withCredentials: true,
});

// The backend hands the CSRF token over via JSON; we cache it in memory and
// attach it as a header on mutating requests. The matching cookie is set on
// the frontend origin because production API traffic passes through the
// same-origin proxy, so Safari can reliably send the double-submit pair.
let cachedCsrfToken = null;
let csrfFetchPromise = null;

async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfFetchPromise) {
    csrfFetchPromise = api.get('/csrf-token').then((res) => {
      cachedCsrfToken = res.data?.data?.csrfToken || null;
      return cachedCsrfToken;
    });
  }
  return csrfFetchPromise;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !config.url?.includes('/csrf-token')) {
    const token = await ensureCsrfToken();
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

let isRefreshing = false;
let queue = [];

function resolveQueue(error) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthCall = original?.url?.includes('/auth/');

    // A 403 here almost always means our cached CSRF token went stale
    // (e.g. the backend restarted and rotated its secret, or this is the
    // very first request and the cache was never populated correctly).
    // Clear the cache and retry once with a freshly fetched token before
    // giving up, rather than forcing the user to reload the page.
    if (status === 403 && !original._csrfRetry && !original.url?.includes('/csrf-token')) {
      original._csrfRetry = true;
      cachedCsrfToken = null;
      csrfFetchPromise = null;
      return api(original);
    }

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original));
      }

      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        resolveQueue(null);
        return api(original);
      } catch (refreshError) {
        resolveQueue(refreshError);
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
