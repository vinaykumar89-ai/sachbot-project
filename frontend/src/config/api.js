// Centralized API Base URL configuration
// Priority:
// 1. Explicit import.meta.env.VITE_API_BASE_URL if configured
// 2. When hosted on Cloudflare Workers / Pages (*.workers.dev, *.pages.dev) or remote origin,
//    automatically route to the live Render backend (https://sachbot-project.onrender.com)
// 3. When on localhost / 127.0.0.1, use "" so the local Vite proxy directs /api to http://127.0.0.1:8001
const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (!isLocalhost) {
      return 'https://sachbot-project.onrender.com';
    }
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default {
  API_BASE_URL,
  apiUrl,
};
