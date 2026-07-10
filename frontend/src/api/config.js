// Central place for backend URLs. Set VITE_API_BASE_URL in your deployment
// env (e.g. Vercel/Netlify project settings, or a .env.production file) to
// your real backend, e.g. https://api.yourapp.com/api. Falls back to
// localhost so local dev works with zero config.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Django admin lives at the backend's origin (no /api suffix), so derive it
// from API_BASE_URL rather than hardcoding a separate URL. If you set
// ADMIN_URL in the backend's env to something other than 'admin/', set the
// matching VITE_ADMIN_PATH here too (no leading/trailing slashes needed),
// or this link will 404.
const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || 'admin'
export const DJANGO_ADMIN_URL = `${API_BASE_URL.replace(/\/api\/?$/, '')}/${ADMIN_PATH}`