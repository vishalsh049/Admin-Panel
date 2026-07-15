// Razorpay payment-gateway client.
// Credentials come from the Integration Settings config cache (DB-backed,
// admin-editable), not process.env — see services/integrationConfigService.js.
// Wraps the official SDK behind the same "configured?" guard style as
// fshipService so the store keeps working (COD only) when keys are absent
// or the integration is disabled.
// Signature checks follow Razorpay's documented scheme:
//   checkout:  HMAC-SHA256(order_id + "|" + payment_id, key_secret)
//   webhook:   HMAC-SHA256(raw request body, webhook_secret)
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { getCachedConfig } = require("./integrationConfigService");

function cfg() {
  return getCachedConfig("razorpay");
}

function isRazorpayConfigured() {
  const c = cfg();
  return Boolean(c.enabled && c.keyId && c.keySecret);
}

function isWebhookConfigured() {
  const c = cfg();
  return Boolean(c.enabled && c.webhookSecret);
}

function getKeyId() {
  return isRazorpayConfigured() ? cfg().keyId : null;
}

// No module-level client singleton — credentials can change at runtime
// (admin edits Integration Settings), so a fresh lightweight SDK instance is
// built per call. Constructing the SDK client does no network I/O.
function getClient() {
  if (!isRazorpayConfigured()) {
    const err = new Error("Razorpay is not configured on the server");
    err.status = 503;
    throw err;
  }
  const c = cfg();
  return new Razorpay({ key_id: c.keyId, key_secret: c.keySecret });
}

// amount is in paise (integer). receipt ties the gateway order back to the
// store order; notes travel into every webhook payload for reconciliation.
async function createGatewayOrder({ amountPaise, receipt, notes }) {
  return getClient().orders.create({
    amount: amountPaise,
    currency: cfg().currency || "INR",
    receipt,
    notes: notes || {},
    payment_capture: 1,
  });
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!isRazorpayConfigured()) return false;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
  const expected = crypto
    .createHmac("sha256", cfg().keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, razorpaySignature);
}

// rawBody must be the exact bytes Razorpay sent (captured in server.js via
// express.json's `verify` hook) — re-serialized JSON would not match.
function verifyWebhookSignature(rawBody, signature) {
  if (!isWebhookConfigured() || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac("sha256", cfg().webhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}

async function fetchPayment(paymentId) {
  return getClient().payments.fetch(paymentId);
}

async function fetchGatewayOrder(orderId) {
  return getClient().orders.fetch(orderId);
}

async function fetchPaymentsForOrder(orderId) {
  const result = await getClient().orders.fetchPayments(orderId);
  return result?.items || [];
}

// amountPaise omitted = full refund. speed "normal" avoids instant-refund fees.
async function createRefund(paymentId, { amountPaise, notes } = {}) {
  const payload = { speed: "normal", notes: notes || {} };
  if (amountPaise) payload.amount = amountPaise;
  return getClient().payments.refund(paymentId, payload);
}

// Used by the Integration Settings "Test Connection" button — takes explicit
// candidate credentials (possibly unsaved form values) rather than the
// configured client, and makes one trivial read-only call to confirm they
// authenticate.
async function testCredentials({ keyId, keySecret }) {
  if (!keyId || !keySecret) {
    throw new Error("Key ID and Key Secret are required");
  }
  const testClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  await testClient.orders.all({ count: 1 });
}

module.exports = {
  isRazorpayConfigured,
  isWebhookConfigured,
  getKeyId,
  createGatewayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchGatewayOrder,
  fetchPaymentsForOrder,
  createRefund,
  testCredentials,
};
