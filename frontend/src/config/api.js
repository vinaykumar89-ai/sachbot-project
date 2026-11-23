// Centralized API Base URL configuration
// Reads VITE_API_BASE_URL for split deployments (e.g. Cloudflare Pages + Render / Hugging Face Spaces)
// Defaults to empty string "" so same-origin /api/* works automatically on Cloudflare Workers (Assets + Worker)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default {
  API_BASE_URL,
  apiUrl,
};
