import axios from "axios";

// Many pages call the bare `axios` singleton directly instead of the shared
// `services/api.js` instance (which has its own interceptor), so the admin
// JWT needs to be set as a default header on the singleton itself — this
// makes every raw axios.get/post/... call in the app authorized in one place.
// For raw fetch() calls that bypass axios entirely — spread into the request's
// headers so protected admin endpoints receive the Bearer token.
export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

export function setAuthHeader(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}
