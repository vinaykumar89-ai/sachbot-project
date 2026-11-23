// Centralized API Base URL configuration
// In development, defaults to "" so Vite local proxy (/api -> http://127.0.0.1:8001) works seamlessly.
// In production, reads VITE_API_BASE_URL or falls back to your hosted Render backend:
// https://sachbot-project.onrender.com
const DEFAULT_PROD_API = 'https://sachbot-project.onrender.com';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API : '')
).trim().replace(/\/+$/, '');

export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default {
  API_BASE_URL,
  apiUrl,
};
