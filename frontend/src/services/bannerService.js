import api from "./api";

export async function getBanners(placement) {
  const { data } = await api.get("/api/admin/banners", { params: placement ? { placement } : {} });
  return data;
}

export async function createBanner(payload) {
  const { data } = await api.post("/api/admin/banners", payload);
  return data;
}

export async function updateBanner(id, payload) {
  const { data } = await api.put(`/api/admin/banners/${id}`, payload);
  return data;
}

export async function deleteBanner(id) {
  const { data } = await api.delete(`/api/admin/banners/${id}`);
  return data;
}

export async function duplicateBanner(id) {
  const { data } = await api.post(`/api/admin/banners/${id}/duplicate`);
  return data;
}

export async function bulkBannerAction(ids, action) {
  const { data } = await api.post("/api/admin/banners/bulk", { ids, action });
  return data;
}

export async function reorderBanners(ids) {
  const { data } = await api.put("/api/admin/banners/reorder", { ids });
  return data;
}

export async function getTestimonials() {
  const { data } = await api.get("/api/admin/banners/testimonials/all");
  return data;
}

export async function createTestimonial(payload) {
  const { data } = await api.post("/api/admin/banners/testimonials", payload);
  return data;
}

export async function updateTestimonial(id, payload) {
  const { data } = await api.put(`/api/admin/banners/testimonials/${id}`, payload);
  return data;
}

export async function deleteTestimonial(id) {
  const { data } = await api.delete(`/api/admin/banners/testimonials/${id}`);
  return data;
}
