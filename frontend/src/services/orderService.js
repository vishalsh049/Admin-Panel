import api from "./api";

// All admin order-management API calls in one place, mirroring
// purchaseBillService.js. Server recomputes/validates everything — client
// payloads are for UX only.

const BASE = "/api/store/admin/orders";

export const fetchOrderStats = () => api.get(`${BASE}/stats`).then((r) => r.data);

export const fetchOrders = (filters) => api.get(BASE, { params: filters }).then((r) => r.data);

export const fetchOrder = (id) => api.get(`${BASE}/${id}`).then((r) => r.data.data);

export const exportOrdersCsv = (filters) =>
  api.get(`${BASE}/export`, { params: filters, responseType: "blob" }).then((r) => r.data);

export const fetchStaffList = () => api.get(`${BASE}/meta/staff`).then((r) => r.data.data);

export const fetchOrderTags = () => api.get(`${BASE}/meta/tags`).then((r) => r.data.data);

export const createOrderTag = (payload) => api.post(`${BASE}/meta/tags`, payload).then((r) => r.data);

export const updateOrderStatus = ({ id, status }) =>
  api.patch(`${BASE}/${id}/status`, { status }).then((r) => r.data);

export const bulkUpdateStatus = ({ orderIds, status }) =>
  api.post(`${BASE}/bulk/status`, { orderIds, status }).then((r) => r.data);

export const holdOrder = ({ id, isHold, reason }) =>
  api.patch(`${BASE}/${id}/hold`, { isHold, reason }).then((r) => r.data);

export const assignOrder = ({ id, assignedTo }) =>
  api.patch(`${BASE}/${id}/assign`, { assignedTo }).then((r) => r.data);

export const fetchOrderNotes = (id) => api.get(`${BASE}/${id}/notes`).then((r) => r.data.data);

export const addOrderNote = ({ id, note, isPinned }) =>
  api.post(`${BASE}/${id}/notes`, { note, isPinned }).then((r) => r.data);

export const updateOrderNote = ({ id, noteId, note, isPinned }) =>
  api.put(`${BASE}/${id}/notes/${noteId}`, { note, isPinned }).then((r) => r.data);

export const deleteOrderNote = ({ id, noteId }) =>
  api.delete(`${BASE}/${id}/notes/${noteId}`).then((r) => r.data);

export const tagOrder = ({ id, tagId, name }) =>
  api.post(`${BASE}/${id}/tags`, { tagId, name }).then((r) => r.data);

export const untagOrder = ({ id, tagId }) =>
  api.delete(`${BASE}/${id}/tags/${tagId}`).then((r) => r.data);

export const fetchOrderTimeline = (id) => api.get(`${BASE}/${id}/timeline`).then((r) => r.data.data);

export const fetchOrderRequests = (filters) =>
  api.get(`${BASE}/requests`, { params: filters }).then((r) => r.data);

export const decideOrderRequest = ({ id, requestId, status, adminNote }) =>
  api.patch(`${BASE}/${id}/requests/${requestId}`, { status, adminNote }).then((r) => r.data);

export const duplicateOrder = (id) => api.post(`${BASE}/${id}/duplicate`).then((r) => r.data);

export const fetchOrderRefunds = (id) => api.get(`${BASE}/${id}/refunds`).then((r) => r.data.data);

export const addManualRefund = ({ id, amount, reason, method }) =>
  api.post(`${BASE}/${id}/refunds`, { amount, reason, method }).then((r) => r.data);

export const fetchInvoicePdfBlob = (id, layout = "a4") =>
  api.get(`${BASE}/${id}/invoice`, { params: { layout }, responseType: "blob" }).then((r) => r.data);

// JSON shape consumed directly by pages/Invoice.jsx (the existing shared
// Sale Bills / Orders invoice design) when reached via ?orderId=.
export const fetchOrderInvoiceData = (id) => api.get(`${BASE}/${id}/invoice/data`).then((r) => r.data.data);

export const emailInvoice = ({ id, to }) => api.post(`${BASE}/${id}/invoice/email`, { to }).then((r) => r.data);

export const fetchInvoiceShareLink = (id) => api.get(`${BASE}/${id}/invoice/share-link`).then((r) => r.data.data);

export const fetchInvoiceHistory = (id) => api.get(`${BASE}/${id}/invoice/history`).then((r) => r.data.data);

export const generateCreditNote = ({ id, refundId }) =>
  api.post(`${BASE}/${id}/invoice/credit-note`, { refundId }, { responseType: "blob" }).then((r) => r.data);
