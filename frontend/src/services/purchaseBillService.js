import api from "./api";

// All purchase-bill API calls in one place. Server recomputes every total —
// the payload's client-side numbers are for UX only.

export const fetchPurchaseDashboard = () =>
  api.get("/api/purchase-bills/dashboard").then((r) => r.data);

export const fetchPurchaseBills = (filters) =>
  api.get("/api/purchase-bills", { params: filters }).then((r) => r.data);

export const fetchPurchaseBill = (id) =>
  api.get(`/api/purchase-bills/${id}`).then((r) => r.data);

export const fetchNextBillNumber = () =>
  api.get("/api/purchase-bills/next-number").then((r) => r.data.bill_number);

export const fetchPurchaseMeta = () =>
  api.get("/api/purchase-bills/meta").then((r) => r.data);

export const createPurchaseBill = (payload) =>
  api.post("/api/purchase-bills", payload).then((r) => r.data);

export const updatePurchaseBill = ({ id, ...payload }) =>
  api.put(`/api/purchase-bills/${id}`, payload).then((r) => r.data);

export const deletePurchaseBill = (id) =>
  api.delete(`/api/purchase-bills/${id}`).then((r) => r.data);

export const changeBillStatus = ({ id, status }) =>
  api.post(`/api/purchase-bills/${id}/status`, { status }).then((r) => r.data);

export const addBillPayment = ({ id, ...payload }) =>
  api.post(`/api/purchase-bills/${id}/payments`, payload).then((r) => r.data);

export const deleteBillPayment = ({ id, paymentId }) =>
  api.delete(`/api/purchase-bills/${id}/payments/${paymentId}`).then((r) => r.data);

export const duplicatePurchaseBill = (id) =>
  api.post(`/api/purchase-bills/${id}/duplicate`).then((r) => r.data);

export const importPurchaseBills = (bills) =>
  api.post("/api/purchase-bills/import", { bills }).then((r) => r.data);

export const uploadBillAttachments = ({ id, files }) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return api
    .post(`/api/purchase-bills/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteBillAttachment = ({ id, attachmentId }) =>
  api.delete(`/api/purchase-bills/${id}/attachments/${attachmentId}`).then((r) => r.data);

export const exportPurchaseBillsCsv = (filters) =>
  api
    .get("/api/purchase-bills/export", { params: filters, responseType: "blob" })
    .then((r) => r.data);

export const fetchBillPdfBlob = (id) =>
  api
    .get(`/api/purchase-bills/pdf/${id}`, { responseType: "blob" })
    .then((r) => r.data);

export const searchVendors = (search) =>
  api.get("/api/vendors", { params: { search } }).then((r) => r.data);

export const createVendor = (payload) =>
  api.post("/api/vendors", payload).then((r) => r.data);

export const searchProducts = (search) =>
  api
    .get("/api/products", { params: { search, limit: 20 } })
    .then((r) => r.data.products || []);
