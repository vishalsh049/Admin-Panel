import api from "./api";

export async function getPosts(params = {}) {
  const { data } = await api.get("/api/admin/blog/posts", { params });
  return data;
}

export async function getPost(id) {
  const { data } = await api.get(`/api/admin/blog/posts/${id}`);
  return data;
}

export async function createPost(payload) {
  const { data } = await api.post("/api/admin/blog/posts", payload);
  return data;
}

export async function updatePost(id, payload) {
  const { data } = await api.put(`/api/admin/blog/posts/${id}`, payload);
  return data;
}

export async function deletePost(id) {
  const { data } = await api.delete(`/api/admin/blog/posts/${id}`);
  return data;
}

// Imports/updates every published WordPress post — can take a while when
// images need downloading, so no client timeout.
export async function syncWordPressPosts() {
  const { data } = await api.post("/api/admin/blog/sync-wordpress", {}, { timeout: 0 });
  return data;
}

export async function getCategories() {
  const { data } = await api.get("/api/admin/blog/categories");
  return data;
}

export async function createCategory(payload) {
  const { data } = await api.post("/api/admin/blog/categories", payload);
  return data;
}

export async function updateCategory(id, payload) {
  const { data } = await api.put(`/api/admin/blog/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/api/admin/blog/categories/${id}`);
  return data;
}

export async function getAuthors() {
  const { data } = await api.get("/api/admin/blog/authors");
  return data;
}

export async function createAuthor(payload) {
  const { data } = await api.post("/api/admin/blog/authors", payload);
  return data;
}

export async function updateAuthor(id, payload) {
  const { data } = await api.put(`/api/admin/blog/authors/${id}`, payload);
  return data;
}

export async function deleteAuthor(id) {
  const { data } = await api.delete(`/api/admin/blog/authors/${id}`);
  return data;
}
