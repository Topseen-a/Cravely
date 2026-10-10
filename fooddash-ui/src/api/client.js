import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on a signed-in request means the session expired: clear it and go to
// login. Login/register 401s are normal "wrong password" errors and are left
// for the form to show.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?expired=1&next=${next}`;
    }
    return Promise.reject(error);
  },
);

// WebSocket base: same host as the API (works whether or not VITE_API_URL
// ends in /api/v1, since the backend serves sockets under both).
export function wsUrl(path) {
  const token = encodeURIComponent(localStorage.getItem('token') || '');
  return `${API_URL.replace(/^http/, 'ws')}/ws${path}?token=${token}`;
}

export default api;
