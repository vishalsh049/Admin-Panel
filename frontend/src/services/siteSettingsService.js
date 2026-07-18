import api from "./api";

export async function getSiteSettings() {
  const { data } = await api.get("/api/admin/site-settings");
  return data;
}

export async function updateSiteSettings(payload) {
  const { data } = await api.put("/api/admin/site-settings", payload);
  return data;
}
