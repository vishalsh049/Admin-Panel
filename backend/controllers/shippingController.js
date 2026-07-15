const { Op } = require("sequelize");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");
const {
  isFshipConfigured,
  getPickupAddressId,
  createForwardOrder,
  registerPickup,
  cancelFshipOrder,
  getCourierList,
  getTrackingHistory,
  getShipmentSummary,
  getShippingLabelByPickupId,
  calculateRate,
  checkPincodeServiceability,
} = require("../services/fshipService");
const { validateShipmentInput } = require("../utils/shippingHelper");

// The shipping fields exposed to the admin UI — kept in one place so every
// endpoint returns the same shape after mutating an order.
function serializeShipping(order) {
  return {
    orderId: order.id,
    awb: order.trackingNumber || null,
    fshipOrderId: order.fshipOrderId || null,
    fshipPickupId: order.fshipPickupId || null,
    courierName: order.courierName || null,
    routeCode: order.routeCode || null,
    shippingStatus: order.shippingStatus || "not_created",
    trackingStatus: order.trackingStatus || null,
    trackingLocation: order.trackingLocation || null,
    trackingRemark: order.trackingRemark || null,
    lastScanAt: order.lastScanAt || null,
    labelUrl: order.labelUrl || null,
    manifestUrl: order.manifestUrl || null,
    invoiceUrl: order.invoiceUrl || null,
    orderStatus: order.status,
  };
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

// ─── Shared shipment creation ─────────────────────────────────────────────────
// Used by the automatic post-checkout flow (routes/storeRoutes.js) and the
// admin "Create Shipment" retry action. Never throws — the order must survive
// a shipping failure; instead it marks shippingStatus and reports back.
async function createShipmentForOrder(order, { autoRegisterPickup = true } = {}) {
  if (!isFshipConfigured()) {
    return { ok: false, error: "FShip is not configured (signature / pickup address id missing)" };
  }
  if (order.trackingNumber && order.shippingStatus !== "cancelled") {
    return { ok: false, error: `A shipment already exists for this order (AWB ${order.trackingNumber})`, duplicate: true };
  }

  const items = parseJson(order.items, []);
  const shippingAddress = parseJson(order.shippingAddress, {});

  const validationErrors = validateShipmentInput({
    customerName: order.customerName,
    customerPhone: order.customerPhone || shippingAddress.phone,
    shippingAddress,
    items,
    paymentMethod: order.paymentMethod || "cod",
    totalPrice: order.totalPrice,
    pickupAddressId: getPickupAddressId(),
  });
  if (validationErrors.length > 0) {
    await order.update({ shippingStatus: "pending" });
    return { ok: false, error: `Shipment validation failed: ${validationErrors.join("; ")}` };
  }

  try {
    const fshipResult = await createForwardOrder({
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone || shippingAddress.phone || "",
      customerEmail: order.customerEmail,
      shippingAddress,
      items,
      paymentMethod: order.paymentMethod || "cod",
      totalPrice: order.totalPrice,
      shippingCharges: Number(order.shippingCharges || 0),
      gstAmount: Number(order.gstAmount || 0),
      discountAmount: Number(order.discountAmount || 0),
      invoiceNumber: order.invoiceNumber || `INV-${order.id}`,
    });

    if (!fshipResult || !fshipResult.waybill) {
      await order.update({ shippingStatus: "pending" });
      return { ok: false, error: fshipResult?.response || "FShip did not return a waybill" };
    }

    const updateData = {
      trackingNumber: fshipResult.waybill,
      fshipOrderId: fshipResult.apiorderid ? String(fshipResult.apiorderid) : null,
      routeCode: fshipResult.route_code || null,
      shippingStatus: "created",
      fshipResponse: fshipResult,
    };

    if (autoRegisterPickup) {
      try {
        const pickupResult = await registerPickup([fshipResult.waybill]);
        const pickupId = pickupResult?.apipickuporderids?.[0]?.pickupOrderId;
        if (typeof pickupId !== "undefined" && pickupId !== null) {
          updateData.fshipPickupId = Number(pickupId) || null;
          updateData.shippingStatus = "pickup_registered";
          updateData.fshipResponse = { ...fshipResult, pickup: pickupResult };
        }
      } catch (pickupErr) {
        // Shipment exists; pickup can be registered later from the admin UI.
        console.error("FShip register pickup failed:", pickupErr.message || pickupErr);
      }
    }

    await order.update(updateData);
    return { ok: true, result: fshipResult };
  } catch (err) {
    console.error("FShip order creation failed:", err.message || err);
    await order.update({ shippingStatus: "pending" });
    return { ok: false, error: err.message || "FShip order creation failed" };
  }
}

// Pulls the latest scan from FShip and persists it on the order. Also moves
// the order itself to shipped/delivered when the courier reports it.
async function applyTrackingSummary(order) {
  const summaryResult = await getShipmentSummary(order.trackingNumber);
  const summary = summaryResult?.summary;
  if (!summary) return null;

  const updateData = {
    trackingStatus: summary.status || null,
    trackingLocation: summary.location || null,
    trackingRemark: summary.remark || null,
    lastScanAt: summary.lastscanned ? new Date(summary.lastscanned) : null,
  };
  if (summary.fulfilledby) updateData.courierName = summary.fulfilledby;

  const statusLower = String(summary.status || "").toLowerCase();
  let newOrderStatus = null;
  if (statusLower.includes("delivered") && !statusLower.includes("undelivered")) {
    newOrderStatus = "delivered";
  } else if (
    ["in transit", "dispatched", "shipped", "out for delivery", "picked"].some((s) => statusLower.includes(s))
  ) {
    newOrderStatus = "shipped";
  }
  if (newOrderStatus && order.status !== newOrderStatus && !["cancelled", "delivered"].includes(order.status)) {
    updateData.status = newOrderStatus;
    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: newOrderStatus,
      description: `Courier update: ${summary.status}${summary.location ? ` at ${summary.location}` : ""}`,
    });
  }

  await order.update(updateData);
  return summary;
}

async function findOrder(req, res) {
  const order = await StoreOrder.findByPk(req.params.orderId);
  if (!order) {
    res.status(404).json({ success: false, message: "Order not found" });
    return null;
  }
  return order;
}

// ─── Route handlers (admin-protected) ─────────────────────────────────────────

async function listCouriers(req, res) {
  try {
    const couriers = await getCourierList();
    res.json({ success: true, couriers });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
}

async function createShipment(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (order.status === "cancelled") {
      return res.status(409).json({ success: false, message: "Cannot create a shipment for a cancelled order" });
    }
    const result = await createShipmentForOrder(order, { autoRegisterPickup: false });
    if (!result.ok) {
      return res.status(result.duplicate ? 409 : 422).json({ success: false, message: result.error, shipping: serializeShipping(order) });
    }
    res.json({ success: true, message: "Shipment created", shipping: serializeShipping(order) });
  } catch (err) {
    console.error("Create shipment error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create shipment" });
  }
}

async function registerPickupHandler(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (!order.trackingNumber) {
      return res.status(422).json({ success: false, message: "Create the shipment first — this order has no AWB yet" });
    }
    if (order.fshipPickupId) {
      return res.status(409).json({ success: false, message: `Pickup already registered (id ${order.fshipPickupId})`, shipping: serializeShipping(order) });
    }
    const pickupResult = await registerPickup([order.trackingNumber]);
    const pickupId = pickupResult?.apipickuporderids?.[0]?.pickupOrderId;
    if (typeof pickupId === "undefined" || pickupId === null) {
      return res.status(502).json({ success: false, message: pickupResult?.response || "FShip did not return a pickup order id" });
    }
    await order.update({
      fshipPickupId: Number(pickupId) || null,
      shippingStatus: "pickup_registered",
      fshipResponse: { ...parseJson(order.fshipResponse, {}), pickup: pickupResult },
    });
    res.json({ success: true, message: "Pickup registered", shipping: serializeShipping(order) });
  } catch (err) {
    console.error("Register pickup error:", err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

async function generateLabel(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (!order.fshipPickupId) {
      return res.status(422).json({ success: false, message: "Register pickup first — label files are generated per pickup order" });
    }
    const labelResult = await getShippingLabelByPickupId([order.fshipPickupId]);
    // FShip returns either a single object or an array of per-pickup objects.
    const entries = Array.isArray(labelResult) ? labelResult : [labelResult];
    const entry =
      entries.find((e) => Number(e?.pickupOrderId) === Number(order.fshipPickupId)) || entries[0];
    if (!entry || (!entry.labelfile && !entry.manifestfile && !entry.invoicefile)) {
      return res.status(502).json({ success: false, message: entry?.remark || "FShip did not return document URLs" });
    }
    await order.update({
      labelUrl: entry.labelfile || order.labelUrl,
      manifestUrl: entry.manifestfile || order.manifestUrl,
      invoiceUrl: entry.invoicefile || order.invoiceUrl,
    });
    res.json({ success: true, message: entry.remark || "Documents generated", shipping: serializeShipping(order) });
  } catch (err) {
    console.error("Generate label error:", err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

async function refreshTracking(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (!order.trackingNumber) {
      return res.status(422).json({ success: false, message: "This order has no AWB to track yet" });
    }
    const summary = await applyTrackingSummary(order);
    if (!summary) {
      return res.status(502).json({ success: false, message: "FShip returned no tracking summary for this AWB" });
    }
    res.json({ success: true, summary, shipping: serializeShipping(order) });
  } catch (err) {
    console.error("Refresh tracking error:", err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

async function trackingHistoryHandler(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (!order.trackingNumber) {
      return res.status(422).json({ success: false, message: "This order has no AWB to track yet" });
    }
    const history = await getTrackingHistory(order.trackingNumber);
    res.json({
      success: true,
      summary: history?.summary || null,
      trackingData: history?.trackingdata || [],
      shipping: serializeShipping(order),
    });
  } catch (err) {
    console.error("Tracking history error:", err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

async function cancelShipment(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    if (!order.trackingNumber) {
      return res.status(422).json({ success: false, message: "This order has no shipment to cancel" });
    }
    await cancelFshipOrder(order.trackingNumber, req.body?.reason || "Shipment cancelled by admin");
    await order.update({ shippingStatus: "cancelled" });
    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: order.status,
      description: `Shipment ${order.trackingNumber} cancelled with courier`,
    });
    res.json({ success: true, message: "Shipment cancelled", shipping: serializeShipping(order) });
  } catch (err) {
    console.error("Cancel shipment error:", err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

async function rateCalculatorHandler(req, res) {
  try {
    const { sourcePincode, destinationPincode } = req.body || {};
    if (!/^\d{6}$/.test(String(sourcePincode || "")) || !/^\d{6}$/.test(String(destinationPincode || ""))) {
      return res.status(400).json({ success: false, message: "sourcePincode and destinationPincode must be valid 6-digit pincodes" });
    }
    const rates = await calculateRate(req.body);
    res.json({ success: true, rates: rates?.shipment_rates || [], raw: rates });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
}

async function serviceabilityHandler(req, res) {
  try {
    const { sourcePincode, destinationPincode } = req.body || {};
    if (!/^\d{6}$/.test(String(sourcePincode || "")) || !/^\d{6}$/.test(String(destinationPincode || ""))) {
      return res.status(400).json({ success: false, message: "sourcePincode and destinationPincode must be valid 6-digit pincodes" });
    }
    const result = await checkPincodeServiceability(sourcePincode, destinationPincode);
    res.json({ success: true, serviceability: result });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
}

async function getShippingInfo(req, res) {
  try {
    const order = await findOrder(req, res);
    if (!order) return;
    res.json({ success: true, shipping: serializeShipping(order) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load shipping info" });
  }
}

// ─── Background sync ──────────────────────────────────────────────────────────
// Refreshes tracking for every order that has an AWB but is not yet in a
// terminal state. Invoked on an interval from server.js (opt-in via
// FSHIP_SYNC_INTERVAL_MINUTES) — errors on one order never stop the sweep.
async function syncActiveShipments() {
  if (!isFshipConfigured()) return { synced: 0 };
  const orders = await StoreOrder.findAll({
    where: {
      trackingNumber: { [Op.ne]: null },
      status: { [Op.notIn]: ["delivered", "cancelled"] },
      shippingStatus: { [Op.ne]: "cancelled" },
    },
    order: [["updated_at", "ASC"]],
    limit: 50,
  });

  let synced = 0;
  for (const order of orders) {
    try {
      await applyTrackingSummary(order);
      synced += 1;
    } catch (err) {
      console.error(`Tracking sync failed for order ${order.id}:`, err.message);
    }
  }
  return { synced, total: orders.length };
}

module.exports = {
  createShipmentForOrder,
  applyTrackingSummary,
  syncActiveShipments,
  listCouriers,
  createShipment,
  registerPickupHandler,
  generateLabel,
  refreshTracking,
  trackingHistoryHandler,
  cancelShipment,
  rateCalculatorHandler,
  serviceabilityHandler,
  getShippingInfo,
};
