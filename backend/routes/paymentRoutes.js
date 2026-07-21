// Razorpay payment flow for the storefront + payment management for the admin.
//
// Money-flow design:
//  1. POST /orders          → store order created (unpaid) + gateway order issued
//  2. Razorpay Checkout     → customer pays in the browser
//  3. POST /verify          → signature checked server-side, order marked paid,
//                             shipment created (was deliberately NOT created at
//                             step 1 — prepaid orders ship only after payment)
//  4. POST /webhook         → authoritative fallback: captures/failures/refunds
//                             land here even if the customer closed the tab,
//                             so step 3 being skipped can never lose a payment.
// Every state change is idempotent — webhook retries and verify+webhook racing
// are both safe.
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const sequelize = require("../config/db");

const customerAuth = require("../middleware/customerAuth");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const StoreCustomer = require("../models/StoreCustomer");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");
const { createShipmentForOrder } = require("../controllers/shippingController");
const { priceOrderItems } = require("../utils/orderPricing");
const { sendMail } = require("../utils/mailer");
const { orderConfirmationEmail } = require("../utils/emailTemplates");
const {
  isRazorpayConfigured,
  isWebhookConfigured,
  getKeyId,
  createGatewayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchPaymentsForOrder,
  createRefund,
} = require("../services/razorpayService");

const ONLINE_PAYMENT_METHOD = "razorpay";
const MAX_PAYMENT_EVENTS = 25;

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

function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

// Append-only audit trail inside the paymentDetails JSON column. Capped so a
// misbehaving webhook can't grow the row without bound.
function appendPaymentEvent(details, event) {
  const current = parseJsonField(details, null) || {};
  const events = Array.isArray(current.events) ? current.events : [];
  events.push({ at: new Date().toISOString(), ...event });
  return { ...current, events: events.slice(-MAX_PAYMENT_EVENTS) };
}

// Single idempotent "payment landed" transition shared by /verify and the
// webhook. Whichever arrives first wins; the second is a no-op.
async function markOrderPaid(order, { paymentId, signature, paymentEntity, source }) {
  if (order.isPaid) {
    if (paymentId && order.razorpayPaymentId && paymentId !== order.razorpayPaymentId) {
      // Duplicate capture for an already-paid order (double payment). Record
      // it so the admin can refund the extra charge from the payments screen.
      await order.update({
        paymentDetails: appendPaymentEvent(order.paymentDetails, {
          type: "duplicate_payment_detected",
          paymentId,
          source,
        }),
      });
      console.warn(`Duplicate Razorpay payment ${paymentId} for already-paid order ${order.id}`);
    }
    return { alreadyPaid: true };
  }

  await order.update({
    isPaid: true,
    paidAt: new Date(),
    paymentStatus: "paid",
    razorpayPaymentId: paymentId,
    razorpaySignature: signature || order.razorpaySignature,
    paymentDetails: appendPaymentEvent(order.paymentDetails, {
      type: "payment_captured",
      paymentId,
      source,
      method: paymentEntity?.method,
      amount: paymentEntity?.amount,
    }),
  });

  await StoreOrderStatusHistory.create({
    order_id: order.id,
    status: order.status,
    description: `Payment received via Razorpay (${paymentId})`,
  });

  // Prepaid shipment is created only now, never at order creation. Never
  // throws; on failure shippingStatus becomes "pending" for an admin retry.
  if (!order.trackingNumber) {
    const shipmentResult = await createShipmentForOrder(order);
    if (!shipmentResult.ok) {
      console.error(`FShip shipment for paid order ${order.id} not created:`, shipmentResult.error);
    }
  }

  sendMail({
    to: order.customerEmail,
    subject: `Order Confirmed — #${order.id}`,
    html: orderConfirmationEmail(order),
  });

  return { alreadyPaid: false };
}

// ─── PUBLIC CONFIG ────────────────────────────────────────────────────────────

// GET /api/store/payments/config — lets the checkout decide whether to offer
// online payment at all (COD-only when keys aren't set).
router.get("/config", (req, res) => {
  res.json({ enabled: isRazorpayConfigured(), keyId: getKeyId() });
});

// ─── CUSTOMER FLOW ────────────────────────────────────────────────────────────

// POST /api/store/payments/orders  (protected)
// Creates the store order (unpaid) and a matching Razorpay order. Amount is
// recomputed from DB prices — the client's totals are never trusted here.
router.post("/orders", customerAuth, async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Online payment is currently unavailable. Please use Cash on Delivery." });
    }

    const { items, shippingAddress, billingAddress } = req.body;
    if (!items || !shippingAddress) {
      return res.status(400).json({ message: "items and shippingAddress are required" });
    }

    const customer = await StoreCustomer.findByPk(req.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const pricing = await priceOrderItems(items);

    const order = await StoreOrder.create({
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: shippingAddress.phone || null,
      items: pricing.items,
      shippingAddress,
      billingAddress: billingAddress || null,
      totalPrice: pricing.total,
      shippingCharges: pricing.shippingCharges,
      paymentMethod: ONLINE_PAYMENT_METHOD,
      paymentStatus: "created",
      status: "pending",
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    let gatewayOrder;
    try {
      gatewayOrder = await createGatewayOrder({
        amountPaise: toPaise(pricing.total),
        receipt: `order_${order.id}`,
        notes: { storeOrderId: String(order.id), customerEmail: customer.email },
      });
    } catch (gwErr) {
      // Gateway refused — don't leave a zombie order the customer never saw.
      await order.destroy();
      console.error("Razorpay order creation failed:", gwErr.error?.description || gwErr.message || gwErr);
      return res.status(502).json({ message: "Could not start the payment. Please try again." });
    }

    await order.update({
      razorpayOrderId: gatewayOrder.id,
      paymentDetails: appendPaymentEvent(null, {
        type: "gateway_order_created",
        razorpayOrderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
      }),
    });

    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: "pending",
      description: "Order placed — awaiting online payment",
    });

    res.status(201).json({
      orderId: order.id,
      razorpayOrderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      keyId: getKeyId(),
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: shippingAddress.phone || customer.phone || "",
      },
    });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    console.error("Create payment order error:", err.message);
    res.status(500).json({ message: "Failed to start payment. Please try again." });
  }
});

// POST /api/store/payments/orders/:id/retry  (protected)
// Re-issues a fresh gateway order for an existing unpaid order so a cancelled
// or failed attempt never duplicates the store order itself.
router.post("/orders/:id/retry", customerAuth, async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Online payment is currently unavailable." });
    }

    const order = await StoreOrder.findByPk(req.params.id);
    if (!order || order.customerId !== req.customerId) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.isPaid) {
      return res.status(409).json({ message: "This order is already paid." });
    }
    if (order.status === "cancelled") {
      return res.status(409).json({ message: "This order was cancelled and can no longer be paid." });
    }
    if (order.paymentMethod !== ONLINE_PAYMENT_METHOD) {
      return res.status(409).json({ message: "This order does not use online payment." });
    }

    const gatewayOrder = await createGatewayOrder({
      amountPaise: toPaise(order.totalPrice),
      receipt: `order_${order.id}_r${Date.now()}`,
      notes: { storeOrderId: String(order.id), retry: "true" },
    });

    await order.update({
      razorpayOrderId: gatewayOrder.id,
      paymentStatus: "created",
      paymentDetails: appendPaymentEvent(order.paymentDetails, {
        type: "payment_retry",
        razorpayOrderId: gatewayOrder.id,
      }),
    });

    const customer = await StoreCustomer.findByPk(req.customerId);
    const shippingAddress = parseJsonField(order.shippingAddress, {});

    res.json({
      orderId: order.id,
      razorpayOrderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      keyId: getKeyId(),
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
        contact: order.customerPhone || shippingAddress.phone || customer?.phone || "",
      },
    });
  } catch (err) {
    console.error("Retry payment error:", err.error?.description || err.message);
    res.status(500).json({ message: "Could not restart the payment. Please try again." });
  }
});

// POST /api/store/payments/verify  (protected)
// Razorpay Checkout success handler. The signature proves key_secret holder
// (Razorpay) approved this exact order+payment pair.
router.post("/verify", customerAuth, async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const order = await StoreOrder.findByPk(orderId);
    if (!order || order.customerId !== req.customerId) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment does not match this order" });
    }

    const valid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!valid) {
      await order.update({
        paymentDetails: appendPaymentEvent(order.paymentDetails, {
          type: "signature_verification_failed",
          paymentId: razorpay_payment_id,
        }),
      });
      console.warn(`Razorpay signature verification failed for order ${order.id}`);
      return res.status(400).json({ message: "Payment verification failed. If you were charged, the amount will be reconciled automatically." });
    }

    const { alreadyPaid } = await markOrderPaid(order, {
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      source: "checkout_verify",
    });

    res.json({
      message: alreadyPaid ? "Payment already confirmed" : "Payment verified successfully",
      orderId: order.id,
      paymentId: order.razorpayPaymentId,
      isPaid: true,
    });
  } catch (err) {
    console.error("Verify payment error:", err.message);
    res.status(500).json({ message: "Payment verification failed. Please contact support if you were charged." });
  }
});

// POST /api/store/payments/failure  (protected)
// Called by the checkout when Razorpay reports payment.failed so the attempt
// is visible to the admin even before (or without) the webhook.
router.post("/failure", customerAuth, async (req, res) => {
  try {
    const { orderId, error } = req.body;
    const order = await StoreOrder.findByPk(orderId);
    if (!order || order.customerId !== req.customerId) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!order.isPaid) {
      await order.update({
        paymentStatus: "failed",
        paymentDetails: appendPaymentEvent(order.paymentDetails, {
          type: "payment_failed",
          source: "checkout",
          code: error?.code,
          description: error?.description,
          reason: error?.reason,
          paymentId: error?.metadata?.payment_id,
        }),
      });
    }
    res.json({ message: "Recorded" });
  } catch (err) {
    console.error("Record payment failure error:", err.message);
    res.status(500).json({ message: "Failed to record payment failure" });
  }
});

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────

async function findOrderForWebhookEntity(entity) {
  const byGatewayOrder = entity?.order_id
    ? await StoreOrder.findOne({ where: { razorpayOrderId: entity.order_id } })
    : null;
  if (byGatewayOrder) return byGatewayOrder;

  // A retried payment replaces razorpayOrderId, so an old attempt's webhook
  // may not match — fall back to the storeOrderId we stamp into notes.
  const storeOrderId = Number(entity?.notes?.storeOrderId);
  if (storeOrderId) return StoreOrder.findByPk(storeOrderId);
  return null;
}

// POST /api/store/payments/webhook  (public — authenticated by signature)
// Configure in Razorpay Dashboard > Webhooks with events: payment.captured,
// payment.failed, refund.created, refund.processed.
router.post("/webhook", async (req, res) => {
  try {
    if (!isWebhookConfigured()) {
      console.warn("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(503).json({ message: "Webhook not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
      console.warn("Razorpay webhook signature verification failed");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const refundEntity = req.body?.payload?.refund?.entity;

    if (event === "payment.captured" || event === "order.paid") {
      const entity = paymentEntity || req.body?.payload?.order?.entity;
      const order = await findOrderForWebhookEntity(entity);
      if (!order) {
        console.warn(`Razorpay webhook ${event}: no matching order for ${entity?.order_id}`);
        return res.json({ status: "ignored" });
      }
      // Guard against a capture whose amount doesn't match what we charged
      // (e.g. stale retry attempt) — flag instead of blindly marking paid.
      const expectedPaise = toPaise(order.totalPrice);
      if (paymentEntity && Number(paymentEntity.amount) !== expectedPaise) {
        await order.update({
          paymentDetails: appendPaymentEvent(order.paymentDetails, {
            type: "amount_mismatch",
            paymentId: paymentEntity.id,
            received: paymentEntity.amount,
            expected: expectedPaise,
          }),
        });
        console.error(`Razorpay amount mismatch on order ${order.id}: got ${paymentEntity.amount}, expected ${expectedPaise}`);
        return res.json({ status: "flagged" });
      }
      await markOrderPaid(order, {
        paymentId: paymentEntity?.id,
        paymentEntity,
        source: "webhook",
      });
      return res.json({ status: "ok" });
    }

    if (event === "payment.failed") {
      const order = await findOrderForWebhookEntity(paymentEntity);
      if (order && !order.isPaid) {
        await order.update({
          paymentStatus: "failed",
          paymentDetails: appendPaymentEvent(order.paymentDetails, {
            type: "payment_failed",
            source: "webhook",
            paymentId: paymentEntity?.id,
            code: paymentEntity?.error_code,
            description: paymentEntity?.error_description,
          }),
        });
      }
      return res.json({ status: "ok" });
    }

    if (event === "refund.created" || event === "refund.processed") {
      const order = refundEntity?.payment_id
        ? await StoreOrder.findOne({ where: { razorpayPaymentId: refundEntity.payment_id } })
        : null;
      if (order) {
        const refundRupees = Number(refundEntity.amount) / 100;
        const fullyRefunded = refundRupees >= Number(order.totalPrice) - 0.01;
        await order.update({
          refundId: refundEntity.id,
          refundAmount: refundRupees,
          paymentStatus:
            event === "refund.processed"
              ? fullyRefunded
                ? "refunded"
                : "partially_refunded"
              : "refund_initiated",
          paymentDetails: appendPaymentEvent(order.paymentDetails, {
            type: event,
            refundId: refundEntity.id,
            amount: refundEntity.amount,
            source: "webhook",
          }),
        });
        if (event === "refund.processed") {
          await StoreOrderStatusHistory.create({
            order_id: order.id,
            status: order.status,
            description: `Refund of Rs. ${refundRupees.toFixed(2)} processed (${refundEntity.id})`,
          });
        }
      }
      return res.json({ status: "ok" });
    }

    // Unknown/unsubscribed event — acknowledge so Razorpay doesn't retry.
    res.json({ status: "ignored" });
  } catch (err) {
    console.error("Razorpay webhook error:", err.message);
    // Non-2xx makes Razorpay retry with backoff — correct for transient
    // errors (e.g. DB hiccup) since every handler above is idempotent.
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// ─── ADMIN PAYMENT MANAGEMENT ─────────────────────────────────────────────────

// GET /api/store/payments/admin/list  (admin)
router.get("/admin/list", adminAuth, requirePermission("payments"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { status, search } = req.query;

    const where = { paymentMethod: ONLINE_PAYMENT_METHOD };
    if (status && status !== "all") where.paymentStatus = status;
    if (search && search.trim()) {
      const term = search.trim();
      const orConditions = [
        { razorpayOrderId: { [Op.like]: `%${term}%` } },
        { razorpayPaymentId: { [Op.like]: `%${term}%` } },
        { customerEmail: { [Op.like]: `%${term}%` } },
        { customerName: { [Op.like]: `%${term}%` } },
      ];
      const numericId = Number(term);
      if (Number.isInteger(numericId) && numericId > 0) orConditions.push({ id: numericId });
      where[Op.or] = orConditions;
    }

    const { rows, count } = await StoreOrder.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      attributes: [
        "id", "customerName", "customerEmail", "totalPrice", "status",
        "isPaid", "paidAt", "paymentStatus", "razorpayOrderId",
        "razorpayPaymentId", "refundId", "refundAmount", "created_at",
      ],
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (err) {
    console.error("Admin payments list error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
});

// POST /api/store/payments/admin/:orderId/refund  (admin)
// Full refund by default; pass { amount } (rupees) for a partial refund.
router.post("/admin/:orderId/refund", adminAuth, requirePermission("payments"), async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.isPaid || !order.razorpayPaymentId) {
      return res.status(409).json({ success: false, message: "This order has no captured payment to refund" });
    }
    if (["refunded", "refund_initiated"].includes(order.paymentStatus)) {
      return res.status(409).json({ success: false, message: "A refund is already initiated or completed for this order" });
    }

    const requestedAmount = req.body?.amount != null ? Number(req.body.amount) : null;
    if (requestedAmount != null && (!(requestedAmount > 0) || requestedAmount > Number(order.totalPrice))) {
      return res.status(400).json({ success: false, message: "Refund amount must be between 0 and the order total" });
    }

    const refund = await createRefund(order.razorpayPaymentId, {
      amountPaise: requestedAmount != null ? toPaise(requestedAmount) : undefined,
      notes: { storeOrderId: String(order.id), refundedBy: req.adminEmail || String(req.adminId) },
    });

    await order.update({
      refundId: refund.id,
      refundAmount: Number(refund.amount) / 100,
      paymentStatus: "refund_initiated",
      paymentDetails: appendPaymentEvent(order.paymentDetails, {
        type: "refund_initiated",
        refundId: refund.id,
        amount: refund.amount,
        by: req.adminEmail || req.adminId,
      }),
    });

    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: order.status,
      description: `Refund of Rs. ${(Number(refund.amount) / 100).toFixed(2)} initiated by admin`,
    });

    // Ledger row for the new refunds panel/history — additive, the legacy
    // refundId/refundAmount columns on store_orders above are left untouched.
    await sequelize.query(
      `INSERT INTO store_order_refunds
        (order_id, amount, reason, method, razorpay_refund_id, status, initiated_by, initiated_by_name, created_at, updated_at)
       VALUES (:orderId, :amount, :reason, 'razorpay', :refundId, 'processed', :initiatedBy, :initiatedByName, NOW(), NOW())`,
      {
        replacements: {
          orderId: order.id,
          amount: Number(refund.amount) / 100,
          reason: requestedAmount != null ? "Partial refund" : "Full refund",
          refundId: refund.id,
          initiatedBy: req.adminId || null,
          initiatedByName: req.adminEmail || null,
        },
      }
    );

    res.json({ success: true, message: "Refund initiated", refund: { id: refund.id, amount: refund.amount, status: refund.status } });
  } catch (err) {
    const gatewayMessage = err.error?.description;
    console.error("Admin refund error:", gatewayMessage || err.message);
    res.status(502).json({ success: false, message: gatewayMessage || "Refund failed at the payment gateway" });
  }
});

// POST /api/store/payments/admin/:orderId/sync  (admin)
// Re-fetches the payment state from Razorpay and reconciles the order —
// useful when a webhook was missed or keys were rotated.
router.post("/admin/:orderId/sync", adminAuth, requirePermission("payments"), async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.razorpayOrderId) {
      return res.status(409).json({ success: false, message: "This order has no Razorpay order attached" });
    }

    const payments = await fetchPaymentsForOrder(order.razorpayOrderId);
    const captured = payments.find((p) => p.status === "captured");

    if (captured && !order.isPaid) {
      await markOrderPaid(order, { paymentId: captured.id, paymentEntity: captured, source: "admin_sync" });
    } else if (captured && order.isPaid) {
      // Refresh refund state on an already-paid order.
      const payment = await fetchPayment(captured.id);
      if (Number(payment.amount_refunded) > 0) {
        const refundRupees = Number(payment.amount_refunded) / 100;
        const fullyRefunded = refundRupees >= Number(order.totalPrice) - 0.01;
        await order.update({
          refundAmount: refundRupees,
          paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
        });
      }
    } else if (!captured && !order.isPaid && payments.some((p) => p.status === "failed")) {
      await order.update({ paymentStatus: "failed" });
    }

    await order.reload();
    res.json({
      success: true,
      message: "Payment state synced from Razorpay",
      data: {
        id: order.id,
        isPaid: order.isPaid,
        paymentStatus: order.paymentStatus,
        razorpayPaymentId: order.razorpayPaymentId,
        refundAmount: order.refundAmount,
        gatewayPayments: payments.map((p) => ({ id: p.id, status: p.status, amount: p.amount, method: p.method })),
      },
    });
  } catch (err) {
    const gatewayMessage = err.error?.description;
    console.error("Admin payment sync error:", gatewayMessage || err.message);
    res.status(502).json({ success: false, message: gatewayMessage || "Could not reach the payment gateway" });
  }
});

module.exports = router;
