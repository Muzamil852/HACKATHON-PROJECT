import axios from 'axios';

// Shared API base URL with fallback precedence:
// 1. import.meta.env.VITE_API_BASE_URL (if provided)
// 2. Production fallback: https://civic-nova-ai.onrender.com
// 3. Development fallback: http://localhost:8000
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://civic-nova-ai.onrender.com' : 'http://localhost:8000')
).replace(/\/+$/, '');

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

/**
 * Resolves a backend media/image path (e.g. "/uploads/abc.jpg") to a full accessible URL.
 * Works uniformly in both local development and production environments.
 */
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};

export default api;
export { API_BASE };
