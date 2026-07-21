// Shared order helpers used by both the customer-facing routes in
// storeRoutes.js and the admin routes in orderAdmin.js. Extracted verbatim
// (no behavior change) from storeRoutes.js so the two route files can't fork
// this logic — see Phase 1 of the Orders module upgrade plan.
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";
const RETURN_WINDOW_HOURS = 48;
const NON_RETURNABLE_CATEGORY_KEYWORDS = ["puja", "perfume", "attar"];

function normalizeContact(value) {
  return (value || "").toString().trim().toLowerCase();
}

function normalizePhone(value) {
  return (value || "").toString().replace(/\D/g, "").slice(-10);
}

// Resolves an order for either a logged-in customer (JWT, ownership re-checked)
// or a guest (must supply the order id/tracking number AND a matching contact
// value) — never trusts an id/tracking number alone.
async function resolveOwnedOrder(req) {
  const body = req.body || {};
  const idParam = req.params.id || body.orderId || req.query.orderId;
  const authHeader = req.headers.authorization;

  // Signed, order-scoped, time-limited share link (e.g. for WhatsApp) — see
  // issueInvoiceShareToken(). Deliberately narrower than the JWT/guest paths:
  // it only ever proves "this token was minted for this exact order".
  if (req.query.share && idParam) {
    try {
      const decoded = jwt.verify(req.query.share, JWT_SECRET);
      if (decoded.purpose === "invoice" && String(decoded.orderId) === String(idParam)) {
        return StoreOrder.findByPk(idParam);
      }
    } catch {
      // fall through to other auth modes
    }
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    } catch {
      return null;
    }
    if (decoded.type !== "customer" || !idParam) return null;
    const order = await StoreOrder.findByPk(idParam);
    if (!order || order.customerId !== decoded.id) return null;
    return order;
  }

  const contact = normalizeContact(body.contact || req.query.contact);
  const identifier = idParam || req.query.trackingNumber || body.trackingNumber;
  if (!contact || !identifier) return null;

  const orConditions = [{ trackingNumber: identifier }];
  const numericId = Number(identifier);
  if (Number.isInteger(numericId) && numericId > 0) orConditions.push({ id: numericId });

  const order = await StoreOrder.findOne({ where: { [Op.or]: orConditions } });
  if (!order) return null;

  const emailMatch = normalizeContact(order.customerEmail) === contact;
  const phoneMatch = order.customerPhone && normalizePhone(order.customerPhone) === normalizePhone(contact);
  return emailMatch || phoneMatch ? order : null;
}

const COURIER_URL_BUILDERS = {
  delhivery: (t) => `https://www.delhivery.com/track/package/${t}`,
  bluedart: (t) => `https://www.bluedart.com/tracking?trackingNumber=${t}`,
  dtdc: (t) => `https://www.dtdc.in/trace.asp?trackingNumber=${t}`,
  "india post": (t) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentno=${t}`,
  "ecom express": (t) => `https://www.ecomexpress.in/tracking/?awb_field=${t}`,
};

function buildCourierUrl(courierName, trackingNumber) {
  if (!trackingNumber) return null;
  const builder = COURIER_URL_BUILDERS[(courierName || "").toLowerCase().trim()];
  if (builder) return builder(encodeURIComponent(trackingNumber));
  const query = encodeURIComponent(`track ${courierName || ""} ${trackingNumber}`.trim());
  return `https://www.google.com/search?q=${query}`;
}

// MySQL JSON columns can come back from Sequelize as either a parsed
// object/array or a raw JSON-encoded string depending on driver version —
// every JSON column is normalized defensively before use.
function parseJsonField(value, fallback) {
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

function computeReturnEligibility(status, items, deliveredAt) {
  if (status !== "delivered") {
    return { eligible: false, reason: "Order has not been delivered yet.", windowEndsAt: null };
  }
  const hasNonReturnable = items.some((item) => {
    const category = (item.category || "").toLowerCase();
    return NON_RETURNABLE_CATEGORY_KEYWORDS.some((kw) => category.includes(kw));
  });
  if (hasNonReturnable) {
    return { eligible: false, reason: "One or more items in this order are non-returnable.", windowEndsAt: null };
  }
  const windowEndsAt = new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_HOURS * 60 * 60 * 1000);
  const eligible = Date.now() <= windowEndsAt.getTime();
  return {
    eligible,
    reason: eligible ? null : "The 48-hour return window has ended.",
    windowEndsAt,
  };
}

async function formatOrder(order) {
  const historyRows = await StoreOrderStatusHistory.findAll({
    where: { order_id: order.id },
    order: [["created_at", "ASC"]],
  });

  const timeline = historyRows.length
    ? historyRows.map((h) => ({ status: h.status, description: h.description, createdAt: h.created_at }))
    : [{ status: order.status, description: null, createdAt: order.updated_at }];

  const items = parseJsonField(order.items, []);
  const shippingAddress = parseJsonField(order.shippingAddress, null);
  const billingAddress = parseJsonField(order.billingAddress, null) || shippingAddress;

  const deliveredEntry = [...timeline].reverse().find((t) => t.status === "delivered");
  const returnEligibility = computeReturnEligibility(
    order.status,
    items,
    deliveredEntry ? deliveredEntry.createdAt : order.updated_at
  );

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
    },
    shippingAddress,
    billingAddress,
    items,
    totals: {
      subtotal,
      shippingCharges: Number(order.shippingCharges || 0),
      discountAmount: Number(order.discountAmount || 0),
      couponCode: order.couponCode || null,
      gstAmount: Number(order.gstAmount || 0),
      totalPrice: Number(order.totalPrice),
    },
    payment: {
      method: order.paymentMethod,
      status: order.isPaid ? "paid" : "unpaid",
      paidAt: order.paidAt,
      gatewayStatus: order.paymentStatus || null,
      razorpayOrderId: order.razorpayOrderId || null,
      razorpayPaymentId: order.razorpayPaymentId || null,
      refundId: order.refundId || null,
      refundAmount: order.refundAmount != null ? Number(order.refundAmount) : null,
    },
    tracking: {
      trackingNumber: order.trackingNumber || null,
      courierName: order.courierName || null,
      courierTrackingUrl: buildCourierUrl(order.courierName, order.trackingNumber),
      expectedDeliveryDate: order.expectedDeliveryDate,
      shippingStatus: order.shippingStatus || "not_created",
      currentStatus: order.trackingStatus || null,
      location: order.trackingLocation || null,
      remark: order.trackingRemark || null,
      lastScanAt: order.lastScanAt || null,
    },
    invoiceNumber: order.invoiceNumber || null,
    fship: {
      orderId: order.fshipOrderId || null,
      pickupId: order.fshipPickupId || null,
      response: parseJsonField(order.fshipResponse, null),
    },
    timeline,
    returnEligibility,
    canCancel: ["pending", "processing"].includes(order.status),
    assignedTo: order.assignedTo || null,
    assignedToName: order.assignedToName || null,
    isHold: !!order.isHold,
    holdReason: order.holdReason || null,
  };
}

// Order-scoped, purpose-restricted, time-limited token for sharing an
// invoice link outside an authenticated session (WhatsApp/email). Stateless
// JWT — can't be revoked before expiry, but is narrowly scoped and short-lived.
function issueInvoiceShareToken(orderId, expiresIn = "48h") {
  return jwt.sign({ orderId, purpose: "invoice" }, JWT_SECRET, { expiresIn });
}

module.exports = {
  JWT_SECRET,
  RETURN_WINDOW_HOURS,
  NON_RETURNABLE_CATEGORY_KEYWORDS,
  normalizeContact,
  normalizePhone,
  resolveOwnedOrder,
  buildCourierUrl,
  parseJsonField,
  computeReturnEligibility,
  formatOrder,
  issueInvoiceShareToken,
};
