import api from "./api";

export async function getProducts(params = {}) {
  const { data } = await api.get("/api/products", { params });
  return data;
}

export async function getProductStats() {
  const { data } = await api.get("/api/products/stats");
  return data;
}

export async function getProduct(id) {
  const { data } = await api.get(`/api/products/${id}`);
  return data;
}

export async function createProduct(payload) {
  const { data } = await api.post("/api/products", payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await api.put(`/api/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/api/products/${id}`);
  return data;
}

export async function bulkDeleteProducts(ids) {
  const { data } = await api.post("/api/products/bulk-delete", { ids });
  return data;
}

export async function exportProducts(params = {}) {
  const response = await api.get("/api/products/export", { params, responseType: "blob" });
  return response.data;
}

export async function importProducts(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/products/import", formData);
  return data;
}

export async function uploadPrimaryImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post("/api/products/upload-image", formData);
  return data;
}

export async function addGalleryImages(productId, files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("images", file));
  const { data } = await api.post(`/api/products/${productId}/images`, formData);
  return data;
}

export async function deleteGalleryImage(productId, imageId) {
  const { data } = await api.delete(`/api/products/${productId}/images/${imageId}`);
  return data;
}

export async function setPrimaryImage(productId, imageId) {
  const { data } = await api.patch(`/api/products/${productId}/images/${imageId}/primary`);
  return data;
}

export async function reorderImages(productId, order) {
  const { data } = await api.patch(`/api/products/${productId}/images/reorder`, { order });
  return data;
}

export async function getAttributes(productId) {
  const { data } = await api.get(`/api/products/${productId}/attributes`);
  return data;
}

export async function saveAttributes(productId, attributes) {
  const { data } = await api.put(`/api/products/${productId}/attributes`, { attributes });
  return data;
}

export async function getVariations(productId) {
  const { data } = await api.get(`/api/products/${productId}/variations`);
  return data;
}

export async function generateVariations(productId) {
  const { data } = await api.post(`/api/products/${productId}/variations/generate`);
  return data;
}

export async function createVariation(productId, payload) {
  const { data } = await api.post(`/api/products/${productId}/variations`, payload);
  return data;
}

export async function updateVariation(productId, variationId, payload) {
  const { data } = await api.put(`/api/products/${productId}/variations/${variationId}`, payload);
  return data;
}

export async function deleteVariation(productId, variationId) {
  const { data } = await api.delete(`/api/products/${productId}/variations/${variationId}`);
  return data;
}
