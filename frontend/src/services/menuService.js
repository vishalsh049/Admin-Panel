import api from "./api";

export async function getMenuItems(location) {
  const { data } = await api.get("/api/admin/menu-items", { params: { location } });
  return data;
}

export async function createMenuItem(payload) {
  const { data } = await api.post("/api/admin/menu-items", payload);
  return data;
}

export async function updateMenuItem(id, payload) {
  const { data } = await api.put(`/api/admin/menu-items/${id}`, payload);
  return data;
}

export async function deleteMenuItem(id) {
  const { data } = await api.delete(`/api/admin/menu-items/${id}`);
  return data;
}

export async function seedMenuFromCategories(location) {
  const { data } = await api.post("/api/admin/menu-items/seed-from-categories", { location });
  return data;
}
