// Empty string = use Vite dev proxy (vite.config.js forwards /api → localhost:5001)
// In production set VITE_API_URL to your backend domain e.g. https://api.yourdomain.com
export const BASE_URL = import.meta.env.VITE_API_URL || "";
