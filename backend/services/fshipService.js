// FShip courier-aggregator API client.
// Implements the endpoints documented in fship_api_document.pdf (v1.2.3.3):
// every call is JSON over HTTPS authenticated by the `signature` header,
// with a request timeout, one retry on transient failures, and a full
// request/response audit trail in the fship_api_logs table.
// Credentials come from the Integration Settings config cache (DB-backed,
// admin-editable), not process.env — see services/integrationConfigService.js.
// FSHIP_TIMEOUT_MS remains an env-only HTTP tuning knob (not a credential).
const FshipApiLog = require("../models/FshipApiLog");
const {
  normalizeNumber,
  computeShipmentDimensions,
  buildProductsPayload,
} = require("../utils/shippingHelper");
const { getCachedConfig } = require("./integrationConfigService");

const FSHIP_TIMEOUT_MS = Number(process.env.FSHIP_TIMEOUT_MS || 20000);
const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);

function cfg() {
  return getCachedConfig("fship");
}

function isFshipConfigured() {
  const c = cfg();
  return Boolean(c.enabled && c.apiUrl && c.clientSecret && Number(c.pickupAddressId) > 0);
}

function getPickupAddressId() {
  return Number(cfg().pickupAddressId || 0);
}

// All documented endpoints live under /api on both the staging and
// production hosts, so the segment is appended here — that way the
// configured API URL works whether it is set with or without "/api".
function buildFshipUrl(path) {
  const base = String(cfg().apiUrl || "").trim().replace(/\/+$/, "");
  const root = /\/api$/i.test(base) ? base : `${base}/api`;
  return `${root}/${path.replace(/^\/+/, "")}`;
}

async function writeApiLog({ apiName, request, response, httpStatus, success, errorMessage }) {
  try {
    await FshipApiLog.create({ apiName, request, response, httpStatus, success, errorMessage });
  } catch (logErr) {
    // The audit log must never break the shipping flow itself.
    console.error("FShip API log write failed:", logErr.message);
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FSHIP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sendFshipRequest(path, body, { method = "POST" } = {}) {
  const clientSecret = cfg().clientSecret;
  if (!clientSecret) {
    throw new Error("FShip signature is not configured");
  }
  const url = buildFshipUrl(path);
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      signature: clientSecret,
    },
  };
  if (method !== "GET" && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let lastError = null;
  const maxAttempts = 2; // one retry on timeout / network error / 5xx
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetchWithTimeout(url, options);
    } catch (netErr) {
      const isTimeout = netErr.name === "AbortError";
      lastError = new Error(
        isTimeout ? `FShip request timed out after ${FSHIP_TIMEOUT_MS}ms` : `FShip network error: ${netErr.message}`
      );
      console.error(`FShip ${path} attempt ${attempt} failed:`, lastError.message);
      if (attempt === maxAttempts) {
        await writeApiLog({ apiName: path, request: body ?? null, response: null, httpStatus: null, success: false, errorMessage: lastError.message });
        throw lastError;
      }
      continue;
    }

    let payload = null;
    let parseError = null;
    try {
      payload = await response.json();
    } catch (err) {
      parseError = err;
    }

    if (!response.ok && RETRYABLE_HTTP_STATUSES.has(response.status) && attempt < maxAttempts) {
      lastError = new Error(`FShip responded ${response.status}; retrying`);
      console.error(`FShip ${path} attempt ${attempt}:`, lastError.message);
      continue;
    }

    if (parseError) {
      const error = new Error(`FShip responded with non-JSON body (HTTP ${response.status})`);
      await writeApiLog({ apiName: path, request: body ?? null, response: null, httpStatus: response.status, success: false, errorMessage: error.message });
      throw error;
    }

    if (!response.ok) {
      const message =
        response.status === 401
          ? "FShip rejected the API signature — check Integration Settings → FShip"
          : payload?.response || payload?.message || `FShip request failed: ${response.statusText}`;
      const error = new Error(message);
      error.httpStatus = response.status;
      await writeApiLog({ apiName: path, request: body ?? null, response: payload, httpStatus: response.status, success: false, errorMessage: message });
      throw error;
    }

    if (payload && (payload.status === false || payload.error === true)) {
      const message = payload?.response || payload?.message || "FShip returned an error status";
      const error = new Error(message);
      error.httpStatus = response.status;
      await writeApiLog({ apiName: path, request: body ?? null, response: payload, httpStatus: response.status, success: false, errorMessage: message });
      throw error;
    }

    await writeApiLog({ apiName: path, request: body ?? null, response: payload, httpStatus: response.status, success: true, errorMessage: null });
    return payload;
  }

  throw lastError || new Error("FShip request failed");
}

// ─── Order APIs ───────────────────────────────────────────────────────────────

async function createForwardOrder({
  orderId,
  customerName,
  customerPhone,
  customerEmail,
  shippingAddress,
  items,
  paymentMethod,
  totalPrice,
  shippingCharges,
  gstAmount,
  discountAmount,
  invoiceNumber,
}) {
  if (!isFshipConfigured()) return null;
  const c = cfg();

  const addressLine = String(shippingAddress.address || shippingAddress.addressLine1 || shippingAddress.address1 || "").trim();
  const landmark = String(shippingAddress.landmark || shippingAddress.addressLine2 || shippingAddress.address2 || "").trim();
  const city = String(shippingAddress.city || "").trim();
  const pincode = String(shippingAddress.postalCode || shippingAddress.pincode || "").trim();
  const addressType = String(shippingAddress.addressType || shippingAddress.type || "Home").trim() || "Home";
  const orderAmount = Math.max(0, normalizeNumber(totalPrice) - normalizeNumber(gstAmount) - normalizeNumber(shippingCharges));
  const paymentMode = paymentMethod === "cod" ? 1 : 2;
  const { shipmentWeight, shipmentLength, shipmentWidth, shipmentHeight, volumetricWeight } = computeShipmentDimensions(items, {
    defaultWeight: c.defaultWeight,
    defaultLength: c.defaultLength,
    defaultWidth: c.defaultWidth,
    defaultHeight: c.defaultHeight,
  });

  const payload = {
    customer_Name: customerName || "",
    customer_Mobile: customerPhone || "",
    customer_Emailid: customerEmail || "",
    customer_Address: addressLine,
    landMark: landmark,
    customer_Address_Type: addressType,
    customer_PinCode: pincode,
    customer_City: city,
    orderId: String(orderId),
    invoice_Number: invoiceNumber || `INV-${orderId}`,
    payment_Mode: paymentMode,
    express_Type: "surface",
    is_Ndd: 0,
    order_Amount: orderAmount,
    tax_Amount: normalizeNumber(gstAmount),
    extra_Charges: normalizeNumber(shippingCharges),
    total_Amount: normalizeNumber(totalPrice),
    cod_Amount: paymentMode === 1 ? normalizeNumber(totalPrice) : 0,
    shipment_Weight: shipmentWeight,
    shipment_Length: shipmentLength,
    shipment_Width: shipmentWidth,
    shipment_Height: shipmentHeight,
    volumetric_Weight: volumetricWeight,
    latitude: 0,
    longitude: 0,
    pick_Address_ID: Number(c.pickupAddressId || 0),
    return_Address_ID: Number(c.returnAddressId || c.pickupAddressId || 0),
    products: buildProductsPayload(items),
  };

  if (Number(c.defaultCourierId) > 0) {
    payload.courierId = Number(c.defaultCourierId);
  }

  return sendFshipRequest("createforwardorder", payload);
}

async function registerPickup(waybills = []) {
  if (!isFshipConfigured()) return null;
  if (!Array.isArray(waybills) || waybills.length === 0) {
    throw new Error("FShip pickup registration requires at least one waybill");
  }
  return sendFshipRequest("registerpickup", { waybills });
}

async function cancelFshipOrder(waybill, reason = "Shipment cancelled by customer") {
  if (!isFshipConfigured()) return null;
  if (!waybill) {
    throw new Error("FShip cancel order requires a waybill");
  }
  return sendFshipRequest("cancelorder", { waybill, reason });
}

// ─── Courier / tracking / documents ───────────────────────────────────────────

async function getCourierList() {
  return sendFshipRequest("getallcourier", undefined, { method: "GET" });
}

// Full scan history for a single waybill.
async function getTrackingHistory(waybill) {
  if (!waybill) throw new Error("Tracking history requires a waybill");
  return sendFshipRequest("trackinghistory", { waybill: String(waybill) });
}

// Latest scan only (status, location, remark, lastscanned, fulfilledby).
async function getShipmentSummary(waybill) {
  if (!waybill) throw new Error("Shipment summary requires a waybill");
  return sendFshipRequest("shipmentsummary", { waybill: String(waybill) });
}

// Packing-slip data; accepts one waybill or comma-separated list.
async function getShippingLabel(waybills) {
  const value = Array.isArray(waybills) ? waybills.join(",") : String(waybills || "");
  if (!value) throw new Error("Shipping label requires at least one waybill");
  return sendFshipRequest("shippinglabel", { waybill: value });
}

// Ready-made label/invoice/manifest file URLs for registered pickups.
async function getShippingLabelByPickupId(pickupOrderIds) {
  const ids = (Array.isArray(pickupOrderIds) ? pickupOrderIds : [pickupOrderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) throw new Error("Shipping label by pickup id requires at least one pickup order id");
  return sendFshipRequest("shippinglabelbypickupid", { pickupOrderId: ids });
}

async function calculateRate({
  sourcePincode,
  destinationPincode,
  paymentMode,
  amount,
  expressType,
  weight,
  length,
  width,
  height,
}) {
  const l = Math.max(1, normalizeNumber(length) || 10);
  const w = Math.max(1, normalizeNumber(width) || 10);
  const h = Math.max(1, normalizeNumber(height) || 10);
  return sendFshipRequest("ratecalculator", {
    source_Pincode: String(sourcePincode || ""),
    destination_Pincode: String(destinationPincode || ""),
    payment_Mode: String(paymentMode || "P").toUpperCase() === "COD" ? "COD" : "P",
    amount: normalizeNumber(amount),
    express_Type: expressType === "air" ? "air" : "surface",
    shipment_Weight: Math.max(0.1, normalizeNumber(weight) || 1),
    shipment_Length: l,
    shipment_Width: w,
    shipment_Height: h,
    volumetric_Weight: Number(((l * w * h) / 5000).toFixed(2)),
  });
}

async function checkPincodeServiceability(sourcePincode, destinationPincode) {
  return sendFshipRequest("pincodeserviceability", {
    source_Pincode: String(sourcePincode || ""),
    destination_Pincode: String(destinationPincode || ""),
  });
}

// Used by the Integration Settings "Test Connection" button — takes explicit
// candidate credentials (possibly unsaved form values) and makes one
// lightweight, read-only call (the same endpoint getCourierList() uses).
// Deliberately bypasses sendFshipRequest/fship_api_logs so test pings don't
// mix into the production shipment audit trail.
async function testCredentials({ apiUrl, clientSecret }) {
  if (!apiUrl || !clientSecret) {
    throw new Error("API URL and Client Secret are required");
  }
  const base = String(apiUrl).trim().replace(/\/+$/, "");
  const root = /\/api$/i.test(base) ? base : `${base}/api`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FSHIP_TIMEOUT_MS);
  try {
    const response = await fetch(`${root}/getallcourier`, {
      method: "GET",
      headers: { signature: clientSecret },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status === false || payload?.error === true) {
      const message =
        response.status === 401
          ? "FShip rejected the signature"
          : payload?.response || payload?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`FShip request timed out after ${FSHIP_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  isFshipConfigured,
  getPickupAddressId,
  createForwardOrder,
  registerPickup,
  cancelFshipOrder,
  getCourierList,
  getTrackingHistory,
  getShipmentSummary,
  getShippingLabel,
  getShippingLabelByPickupId,
  calculateRate,
  checkPincodeServiceability,
  testCredentials,
};
