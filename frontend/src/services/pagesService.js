import api from "./api";

export async function getPages(params = {}) {
  const { data } = await api.get("/api/admin/pages", { params });
  return data;
}

export async function getPage(id) {
  const { data } = await api.get(`/api/admin/pages/${id}`);
  return data;
}

export async function createPage(payload) {
  const { data } = await api.post("/api/admin/pages", payload);
  return data;
}

export async function updatePage(id, payload) {
  const { data } = await api.put(`/api/admin/pages/${id}`, payload);
  return data;
}

export async function deletePage(id) {
  const { data } = await api.delete(`/api/admin/pages/${id}`);
  return data;
}
