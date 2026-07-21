import api from "./api";

// All POS API calls in one place. Server recomputes every total — the
// payload's client-side numbers are for UX only.

export const searchPosProducts = (params) =>
  api.get("/api/products", { params: { limit: 40, status: "publish", ...params } }).then((r) => r.data);

export const searchCustomers = (search) =>
  api.get("/api/customers", { params: { search } }).then((r) => r.data.data || []);

export const createCustomer = (payload) =>
  api.post("/api/customers", payload).then((r) => r.data.data);

export const fetchPosSales = (filters) =>
  api.get("/api/pos/sales", { params: filters }).then((r) => r.data);

export const fetchPosSummary = (date) =>
  api.get("/api/pos/sales/summary", { params: { date } }).then((r) => r.data);

export const fetchPosSale = (id) =>
  api.get(`/api/pos/sales/${id}`).then((r) => r.data);

export const createPosSale = (payload) =>
  api.post("/api/pos/sales", payload).then((r) => r.data);

export const updatePosSale = ({ id, ...payload }) =>
  api.put(`/api/pos/sales/${id}`, payload).then((r) => r.data);

export const completePosSale = ({ id, payments }) =>
  api.post(`/api/pos/sales/${id}/complete`, { payments }).then((r) => r.data);

export const voidPosSale = ({ id, reason }) =>
  api.delete(`/api/pos/sales/${id}`, { data: { reason } }).then((r) => r.data);

export const returnPosSale = ({ id, ...payload }) =>
  api.post(`/api/pos/sales/${id}/return`, payload).then((r) => r.data);

export const fetchPosSalePdfBlob = (id) =>
  api.get(`/api/pos/sales/${id}/pdf`, { responseType: "blob" }).then((r) => r.data);

export const fetchCategories = () =>
  api.get("/api/categories").then((r) => r.data);
