import api from "./api";

export async function getRoles() {
  const { data } = await api.get("/api/admin/roles");
  return data;
}

export async function createRole(payload) {
  const { data } = await api.post("/api/admin/roles", payload);
  return data;
}

export async function updateRole(id, payload) {
  const { data } = await api.put(`/api/admin/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id) {
  const { data } = await api.delete(`/api/admin/roles/${id}`);
  return data;
}

export async function getMyPermissions() {
  const { data } = await api.get("/api/admin/roles/my-permissions");
  return data;
}
