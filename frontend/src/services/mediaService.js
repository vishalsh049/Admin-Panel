import api from "./api";

export async function getMedia(params = {}) {
  const { data } = await api.get("/api/admin/media", { params });
  return data;
}

export async function uploadMedia(file, meta = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (meta.alt_text) formData.append("alt_text", meta.alt_text);
  if (meta.title) formData.append("title", meta.title);
  if (meta.folder) formData.append("folder", meta.folder);
  const { data } = await api.post("/api/admin/media/upload", formData);
  return data;
}

export async function updateMediaMeta(id, payload) {
  const { data } = await api.put(`/api/admin/media/${id}`, payload);
  return data;
}

export async function deleteMedia(id) {
  const { data } = await api.delete(`/api/admin/media/${id}`);
  return data;
}
