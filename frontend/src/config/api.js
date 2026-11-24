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
  // When running under Cloudflare Workers (*.workers.dev, *.pages.dev) or locally on Vite,
  // relative URLs ("") allow worker.js or the Vite dev proxy to route /api cleanly to Render.
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    if (
      hostname.endsWith('.workers.dev') ||
      hostname.endsWith('.pages.dev') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return '';
    }
    // Remote standalone origins fallback to Render backend
    return 'https://sachbot-project.onrender.com';
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
