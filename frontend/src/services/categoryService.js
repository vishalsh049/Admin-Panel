import api from "./api";

export async function getCategories(params = {}) {
  const { data } = await api.get("/api/categories", { params });
  return data;
}

export async function createCategory(payload) {
  const { data } = await api.post("/api/categories", payload);
  return data;
}

export async function updateCategory(id, payload) {
  const { data } = await api.put(`/api/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/api/categories/${id}`);
  return data;
}

export async function bulkDeleteCategories(ids) {
  const { data } = await api.post("/api/categories/bulk-delete", { ids });
  return data;
}

export async function uploadCategoryImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post("/api/categories/upload-image", formData);
  return data;
}
