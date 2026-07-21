// Admin order-management API — everything the premium Orders dashboard needs
// beyond the 3 bare endpoints storeRoutes.js used to expose (list/get/status).
// Mounted at /api/store/admin/orders in server.js, BEFORE the general
// app.use("/api/store", storeRoutes) mount so these more specific routes win.
// Notes/tags/activity-log/refunds tables are new (migration 0031) and have no
// Sequelize model — queried with raw sequelize.query, matching the convention
// already used by purchaseBills.js/pos.js for their own new tables.
const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");
const StoreOrderRequest = require("../models/StoreOrderRequest");
const SiteSetting = require("../models/SiteSetting");
const { parseJsonField, issueInvoiceShareToken } = require("../utils/orderHelpers");
const { renderInvoicePdf, enrichItems } = require("../utils/invoiceRenderer");
const { sendMail } = require("../utils/mailer");
const { orderStatusChangeEmail } = require("../utils/emailTemplates");

router.use(adminAuth, requirePermission("orders"));

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const REQUEST_STATUSES = ["pending", "approved", "rejected", "completed"];

async function logActivity(orderId, { type, title, description = null, meta = null, req }) {
  await sequelize.query(
    `INSERT INTO store_order_activity_log
      (order_id, type, title, description, meta, actor_id, actor_name, actor_type, created_at)
     VALUES (:orderId, :type, :title, :description, :meta, :actorId, :actorName, 'admin', NOW())`,
    {
      replacements: {
        orderId,
        type,
        title,
        description,
        meta: meta ? JSON.stringify(meta) : null,
        actorId: req?.adminId || null,
        actorName: req?.currentUser?.name || req?.adminEmail || null,
      },
      type: QueryTypes.INSERT,
    }
  );
}

// Builds a shared Sequelize `where` for GET / and GET /export.
async function buildOrdersWhere(query) {
  const { search, status, paymentStatus, paymentMethod, dateFrom, dateTo, tag, assignedTo, isHold } = query;
  const where = {};

  if (status && status !== "all") where.status = status;
  if (paymentStatus && paymentStatus !== "all") where.paymentStatus = paymentStatus;
  if (paymentMethod && paymentMethod !== "all") where.paymentMethod = paymentMethod;
  if (assignedTo === "unassigned") where.assignedTo = null;
  else if (assignedTo && assignedTo !== "all") where.assignedTo = Number(assignedTo);
  if (isHold === "1" || isHold === "true") where.isHold = true;

  if (dateFrom || dateTo) {
    where.created_at = {};
    if (dateFrom) where.created_at[Op.gte] = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.created_at[Op.lte] = new Date(`${dateTo}T23:59:59`);
  }

  if (search && search.trim()) {
    const term = search.trim();
    const orConditions = [
      { customerName: { [Op.like]: `%${term}%` } },
      { customerEmail: { [Op.like]: `%${term}%` } },
      { customerPhone: { [Op.like]: `%${term}%` } },
      { trackingNumber: { [Op.like]: `%${term}%` } },
    ];
    const numericId = Number(term);
    if (Number.isInteger(numericId) && numericId > 0) orConditions.push({ id: numericId });
    where[Op.and] = [...(where[Op.and] || []), { [Op.or]: orConditions }];
  }

  if (tag) {
    const tagRows = await sequelize.query(
      "SELECT order_id FROM store_order_tag_map WHERE tag_id = :tagId",
      { replacements: { tagId: Number(tag) }, type: QueryTypes.SELECT }
    );
    where.id = { [Op.in]: tagRows.length ? tagRows.map((r) => r.order_id) : [-1] };
  }

  return where;
}

const ORDER_SORT_COLUMNS = {
  created_at: "created_at",
  totalPrice: "totalPrice",
  id: "id",
  status: "status",
};

function buildOrderSort(sort) {
  const [byRaw, dirRaw] = (sort || "created_at:desc").split(":");
  const by = ORDER_SORT_COLUMNS[byRaw] || "created_at";
  const dir = (dirRaw || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return [[by, dir]];
}

function serializeOrderRow(order) {
  const data = order.toJSON ? order.toJSON() : order;
  return {
    ...data,
    items: undefined, // list view doesn't need the full items payload
    itemCount: Array.isArray(parseJsonField(data.items, [])) ? parseJsonField(data.items, []).length : 0,
  };
}

// ─── STATS (KPI dashboard) ────────────────────────────────────────────────────

router.get("/stats", async (req, res) => {
  try {
    const [kpis] = await sequelize.query(
      `SELECT
        COUNT(*) AS total_orders,
        IFNULL(SUM(totalPrice), 0) AS total_revenue,
        SUM(created_at >= CURDATE()) AS today_orders,
        IFNULL(SUM(CASE WHEN created_at >= CURDATE() THEN totalPrice END), 0) AS today_revenue,
        SUM(created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS month_orders,
        IFNULL(SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN totalPrice END), 0) AS month_revenue,
        IFNULL(SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
                         AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN totalPrice END), 0) AS prev_month_revenue,
        SUM(status = 'pending') AS pending_orders,
        SUM(status = 'processing') AS processing_orders,
        SUM(status = 'shipped') AS shipped_orders,
        SUM(status = 'delivered') AS delivered_orders,
        SUM(status = 'cancelled') AS cancelled_orders,
        SUM(isHold = 1) AS on_hold_orders,
        SUM(paymentMethod = 'cod' AND isPaid = 0 AND status != 'cancelled') AS pending_cod_count,
        IFNULL(SUM(CASE WHEN paymentMethod = 'cod' AND isPaid = 0 AND status != 'cancelled' THEN totalPrice END), 0) AS pending_cod_amount,
        IFNULL(AVG(totalPrice), 0) AS avg_order_value
       FROM store_orders`,
      { type: QueryTypes.SELECT }
    );

    const [openRequests] = await sequelize.query(
      "SELECT COUNT(*) AS open_requests FROM store_order_requests WHERE status = 'pending'",
      { type: QueryTypes.SELECT }
    );

    const monthly = await sequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
              IFNULL(SUM(totalPrice), 0) AS total,
              COUNT(*) AS orders
       FROM store_orders
       WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01')
       GROUP BY ym ORDER BY ym ASC`,
      { type: QueryTypes.SELECT }
    );

    res.json({ success: true, kpis: { ...kpis, ...openRequests }, monthly });
  } catch (err) {
    console.error("Order stats error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load order stats" });
  }
});

// ─── LIST / EXPORT ────────────────────────────────────────────────────────────

router.get("/export", async (req, res) => {
  try {
    const where = await buildOrdersWhere(req.query);
    const orders = await StoreOrder.findAll({ where, order: buildOrderSort(req.query.sort), limit: 5000 });

    const cols = [
      "id", "customerName", "customerEmail", "customerPhone", "totalPrice",
      "status", "paymentMethod", "isPaid", "paymentStatus", "trackingNumber",
      "courierName", "assignedToName", "isHold", "created_at",
    ];
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = orders.map((o) => o.toJSON());
    const csv = [cols.join(","), ...rows.map((o) => cols.map((c) => esc(o[c])).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=orders-${Date.now()}.csv`);
    res.send("﻿" + csv);
  } catch (err) {
    console.error("Orders export error:", err.message);
    res.status(500).json({ success: false, message: "Export failed" });
  }
});

router.get("/meta/staff", async (req, res) => {
  try {
    const staff = await sequelize.query("SELECT id, name, email FROM users ORDER BY name", {
      type: QueryTypes.SELECT,
    });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load staff list" });
  }
});

router.get("/meta/tags", async (req, res) => {
  try {
    const tags = await sequelize.query("SELECT id, name, color FROM store_order_tags ORDER BY name", {
      type: QueryTypes.SELECT,
    });
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load tags" });
  }
});

router.post("/meta/tags", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Tag name is required" });
    const [id] = await sequelize.query(
      "INSERT INTO store_order_tags (name, color) VALUES (:name, :color)",
      { replacements: { name: name.trim(), color: color || "#6366f1" }, type: QueryTypes.INSERT }
    );
    res.status(201).json({ success: true, data: { id, name: name.trim(), color: color || "#6366f1" } });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError" || /Duplicate entry/.test(err.message)) {
      return res.status(409).json({ success: false, message: "A tag with this name already exists" });
    }
    console.error("Create tag error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create tag" });
  }
});

// ─── RETURN/EXCHANGE/REFUND/COMPLAINT REQUESTS (global) ───────────────────────

router.get("/requests", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { type, status, orderId } = req.query;

    const clauses = [];
    const replacements = { limit, offset: (page - 1) * limit };
    if (type && type !== "all") { clauses.push("r.type = :type"); replacements.type = type; }
    if (status && status !== "all") { clauses.push("r.status = :status"); replacements.status = status; }
    if (orderId) { clauses.push("r.order_id = :orderId"); replacements.orderId = orderId; }
    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const rows = await sequelize.query(
      `SELECT r.id, r.order_id, r.type, r.reason, r.status, r.created_at, r.updated_at,
              o.customerName, o.customerEmail, o.totalPrice
       FROM store_order_requests r
       JOIN store_orders o ON o.id = r.order_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );
    const [{ total }] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM store_order_requests r ${whereSql}`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error("List order requests error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load requests" });
  }
});

// ─── LIST ─────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = await buildOrdersWhere(req.query);

    const { rows, count } = await StoreOrder.findAndCountAll({
      where,
      order: buildOrderSort(req.query.sort),
      limit,
      offset: (page - 1) * limit,
    });

    res.json({
      success: true,
      data: rows.map(serializeOrderRow),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (err) {
    console.error("Admin orders list error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ─── SINGLE ORDER ─────────────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const [tags, [{ notesCount }], [{ requestsCount }]] = await Promise.all([
      sequelize.query(
        `SELECT t.id, t.name, t.color FROM store_order_tags t
         JOIN store_order_tag_map m ON m.tag_id = t.id WHERE m.order_id = :id`,
        { replacements: { id: order.id }, type: QueryTypes.SELECT }
      ),
      sequelize.query("SELECT COUNT(*) AS notesCount FROM store_order_notes WHERE order_id = :id", {
        replacements: { id: order.id }, type: QueryTypes.SELECT,
      }),
      sequelize.query("SELECT COUNT(*) AS requestsCount FROM store_order_requests WHERE order_id = :id", {
        replacements: { id: order.id }, type: QueryTypes.SELECT,
      }),
    ]);

    const data = order.toJSON();
    res.json({
      success: true,
      data: {
        ...data,
        items: parseJsonField(data.items, []),
        shippingAddress: parseJsonField(data.shippingAddress, null),
        billingAddress: parseJsonField(data.billingAddress, null),
        paymentDetails: parseJsonField(data.paymentDetails, null),
        fshipResponse: parseJsonField(data.fshipResponse, null),
        tags, notesCount, requestsCount,
      },
    });
  } catch (err) {
    console.error("Admin order details error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
});

// ─── STATUS / HOLD ────────────────────────────────────────────────────────────

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    await order.update({ status });
    await StoreOrderStatusHistory.create({ order_id: order.id, status, description: null });
    sendMail({ to: order.customerEmail, subject: `Order Update — #${order.id}`, html: orderStatusChangeEmail(order, status) });
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/bulk/status", async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    if (!Array.isArray(orderIds) || !orderIds.length || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "orderIds[] and a valid status are required" });
    }
    const orders = await StoreOrder.findAll({ where: { id: { [Op.in]: orderIds } } });
    await StoreOrder.update({ status }, { where: { id: { [Op.in]: orderIds } } });
    await Promise.all(
      orderIds.map((id) => StoreOrderStatusHistory.create({ order_id: id, status, description: "Bulk status update" }))
    );
    orders.forEach((order) =>
      sendMail({ to: order.customerEmail, subject: `Order Update — #${order.id}`, html: orderStatusChangeEmail(order, status) })
    );
    res.json({ success: true, message: `${orderIds.length} order(s) updated` });
  } catch (err) {
    console.error("Bulk status update error:", err.message);
    res.status(500).json({ success: false, message: "Bulk status update failed" });
  }
});

router.patch("/:id/hold", async (req, res) => {
  try {
    const { isHold, reason } = req.body;
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    await order.update({ isHold: !!isHold, holdReason: isHold ? reason || null : null });
    await logActivity(order.id, {
      type: "hold",
      title: isHold ? "Order put on hold" : "Hold released",
      description: isHold ? reason || null : null,
      req,
    });
    res.json({ success: true, message: isHold ? "Order put on hold" : "Hold released" });
  } catch (err) {
    console.error("Hold order error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update hold state" });
  }
});

// ─── NOTES ────────────────────────────────────────────────────────────────────

router.get("/:id/notes", async (req, res) => {
  try {
    const notes = await sequelize.query(
      "SELECT * FROM store_order_notes WHERE order_id = :id ORDER BY is_pinned DESC, created_at DESC",
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load notes" });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const { note, isPinned } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ success: false, message: "Note text is required" });

    const [id] = await sequelize.query(
      `INSERT INTO store_order_notes (order_id, note, is_pinned, created_by, created_by_name, created_at, updated_at)
       VALUES (:orderId, :note, :isPinned, :createdBy, :createdByName, NOW(), NOW())`,
      {
        replacements: {
          orderId: req.params.id,
          note: note.trim(),
          isPinned: isPinned ? 1 : 0,
          createdBy: req.adminId || null,
          createdByName: req.currentUser?.name || req.adminEmail || null,
        },
        type: QueryTypes.INSERT,
      }
    );
    await logActivity(req.params.id, { type: "note", title: "Note added", description: note.trim(), req });
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error("Add note error:", err.message);
    res.status(500).json({ success: false, message: "Failed to add note" });
  }
});

router.put("/:id/notes/:noteId", async (req, res) => {
  try {
    const { note, isPinned } = req.body;
    await sequelize.query(
      "UPDATE store_order_notes SET note = :note, is_pinned = :isPinned, updated_at = NOW() WHERE id = :noteId AND order_id = :orderId",
      {
        replacements: { note: note?.trim() || "", isPinned: isPinned ? 1 : 0, noteId: req.params.noteId, orderId: req.params.id },
        type: QueryTypes.UPDATE,
      }
    );
    res.json({ success: true, message: "Note updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update note" });
  }
});

router.delete("/:id/notes/:noteId", async (req, res) => {
  try {
    await sequelize.query("DELETE FROM store_order_notes WHERE id = :noteId AND order_id = :orderId", {
      replacements: { noteId: req.params.noteId, orderId: req.params.id },
      type: QueryTypes.DELETE,
    });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete note" });
  }
});

// ─── TAGS (per order) ─────────────────────────────────────────────────────────

router.post("/:id/tags", async (req, res) => {
  try {
    const { tagId, name } = req.body;
    let resolvedTagId = tagId;

    if (!resolvedTagId && name && name.trim()) {
      const existing = await sequelize.query("SELECT id FROM store_order_tags WHERE name = :name", {
        replacements: { name: name.trim() }, type: QueryTypes.SELECT,
      });
      if (existing.length) {
        resolvedTagId = existing[0].id;
      } else {
        const [newId] = await sequelize.query("INSERT INTO store_order_tags (name) VALUES (:name)", {
          replacements: { name: name.trim() }, type: QueryTypes.INSERT,
        });
        resolvedTagId = newId;
      }
    }
    if (!resolvedTagId) return res.status(400).json({ success: false, message: "tagId or name is required" });

    await sequelize.query(
      "INSERT IGNORE INTO store_order_tag_map (order_id, tag_id) VALUES (:orderId, :tagId)",
      { replacements: { orderId: req.params.id, tagId: resolvedTagId }, type: QueryTypes.INSERT }
    );
    await logActivity(req.params.id, { type: "tag", title: "Tag added", description: name || null, req });
    res.status(201).json({ success: true, message: "Tag attached" });
  } catch (err) {
    console.error("Tag order error:", err.message);
    res.status(500).json({ success: false, message: "Failed to tag order" });
  }
});

router.delete("/:id/tags/:tagId", async (req, res) => {
  try {
    await sequelize.query("DELETE FROM store_order_tag_map WHERE order_id = :orderId AND tag_id = :tagId", {
      replacements: { orderId: req.params.id, tagId: req.params.tagId }, type: QueryTypes.DELETE,
    });
    res.json({ success: true, message: "Tag removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove tag" });
  }
});

// ─── STAFF ASSIGNMENT ─────────────────────────────────────────────────────────

router.patch("/:id/assign", async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    let assignedToName = null;
    if (assignedTo) {
      const users = await sequelize.query("SELECT name, email FROM users WHERE id = :id", {
        replacements: { id: assignedTo }, type: QueryTypes.SELECT,
      });
      if (!users.length) return res.status(400).json({ success: false, message: "Staff member not found" });
      assignedToName = users[0].name || users[0].email;
    }

    await order.update({ assignedTo: assignedTo || null, assignedToName });
    await logActivity(order.id, {
      type: "assignment",
      title: assignedTo ? `Assigned to ${assignedToName}` : "Unassigned",
      req,
    });
    res.json({ success: true, message: "Assignment updated", data: { assignedTo: assignedTo || null, assignedToName } });
  } catch (err) {
    console.error("Assign order error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update assignment" });
  }
});

// ─── UNIFIED TIMELINE ─────────────────────────────────────────────────────────

router.get("/:id/timeline", async (req, res) => {
  try {
    const orderId = req.params.id;

    const [statusRows, activityRows, requestRows] = await Promise.all([
      StoreOrderStatusHistory.findAll({ where: { order_id: orderId }, order: [["created_at", "ASC"]] }),
      sequelize.query("SELECT * FROM store_order_activity_log WHERE order_id = :id ORDER BY created_at ASC", {
        replacements: { id: orderId }, type: QueryTypes.SELECT,
      }),
      StoreOrderRequest.findAll({ where: { order_id: orderId }, order: [["created_at", "ASC"]] }),
    ]);

    const events = [
      ...statusRows.map((h) => ({
        type: "status",
        title: `Status changed to ${h.status}`,
        description: h.description,
        actor: null,
        actorType: "system",
        createdAt: h.created_at,
        meta: null,
      })),
      ...activityRows.map((a) => ({
        type: a.type,
        title: a.title,
        description: a.description,
        actor: a.actor_name,
        actorType: a.actor_type,
        createdAt: a.created_at,
        meta: parseJsonField(a.meta, null),
      })),
      ...requestRows.map((r) => ({
        type: "request",
        title: `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} request (${r.status})`,
        description: r.reason,
        actor: null,
        actorType: "customer",
        createdAt: r.created_at,
        meta: { requestId: r.id, requestType: r.type, requestStatus: r.status },
      })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, data: events });
  } catch (err) {
    console.error("Order timeline error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load timeline" });
  }
});

// ─── RETURN/EXCHANGE/REFUND/COMPLAINT REQUEST DECISIONS (per order) ──────────

router.patch("/:id/requests/:requestId", async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid request status" });
    }
    const request = await StoreOrderRequest.findOne({
      where: { id: req.params.requestId, order_id: req.params.id },
    });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    await request.update({ status });
    await logActivity(req.params.id, {
      type: "request_decision",
      title: `${request.type.charAt(0).toUpperCase() + request.type.slice(1)} request ${status}`,
      description: adminNote || null,
      req,
    });

    res.json({
      success: true,
      message: "Request updated",
      // Refunds are never auto-triggered here — the admin must process the
      // actual gateway refund from the Payment section / refunds panel.
      needsGatewayRefund: request.type === "refund" && status === "approved",
    });
  } catch (err) {
    console.error("Decide order request error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update request" });
  }
});

// ─── DUPLICATE / REORDER ──────────────────────────────────────────────────────

router.post("/:id/duplicate", async (req, res) => {
  try {
    const source = await StoreOrder.findByPk(req.params.id);
    if (!source) return res.status(404).json({ success: false, message: "Order not found" });

    const clone = await StoreOrder.create({
      customerId: source.customerId,
      customerName: source.customerName,
      customerEmail: source.customerEmail,
      customerPhone: source.customerPhone,
      items: source.items,
      shippingAddress: source.shippingAddress,
      billingAddress: source.billingAddress,
      totalPrice: source.totalPrice,
      shippingCharges: source.shippingCharges,
      discountAmount: source.discountAmount,
      gstAmount: source.gstAmount,
      couponCode: source.couponCode,
      paymentMethod: source.paymentMethod,
      status: "pending",
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    await StoreOrderStatusHistory.create({
      order_id: clone.id,
      status: "pending",
      description: `Duplicated from order #${source.id}`,
    });
    await logActivity(source.id, { type: "duplicate", title: `Duplicated as order #${clone.id}`, req });

    res.status(201).json({ success: true, message: "Order duplicated", data: { id: clone.id } });
  } catch (err) {
    console.error("Duplicate order error:", err.message);
    res.status(500).json({ success: false, message: "Failed to duplicate order" });
  }
});

// ─── REFUNDS (ledger) ─────────────────────────────────────────────────────────

router.get("/:id/refunds", async (req, res) => {
  try {
    const refunds = await sequelize.query(
      "SELECT * FROM store_order_refunds WHERE order_id = :id ORDER BY created_at DESC",
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: refunds });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load refunds" });
  }
});

router.post("/:id/refunds", async (req, res) => {
  try {
    const { amount, reason, method } = req.body;
    if (!(Number(amount) > 0)) return res.status(400).json({ success: false, message: "A valid amount is required" });

    const [id] = await sequelize.query(
      `INSERT INTO store_order_refunds
        (order_id, amount, reason, method, status, initiated_by, initiated_by_name, created_at, updated_at)
       VALUES (:orderId, :amount, :reason, :method, 'processed', :initiatedBy, :initiatedByName, NOW(), NOW())`,
      {
        replacements: {
          orderId: req.params.id,
          amount: Number(amount),
          reason: reason || null,
          method: method || "manual",
          initiatedBy: req.adminId || null,
          initiatedByName: req.currentUser?.name || req.adminEmail || null,
        },
        type: QueryTypes.INSERT,
      }
    );
    await logActivity(req.params.id, {
      type: "refund",
      title: `Manual refund of Rs. ${Number(amount).toFixed(2)} recorded`,
      description: reason || null,
      req,
    });
    res.status(201).json({ success: true, message: "Refund recorded", data: { id } });
  } catch (err) {
    console.error("Record manual refund error:", err.message);
    res.status(500).json({ success: false, message: "Failed to record refund" });
  }
});

// ─── INVOICE (unified renderer shared with the customer route) ───────────────

// GET /:id/invoice — admin print-preview/download, ?layout=thermal supported.
router.get("/:id/invoice", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.invoiceNumber) await order.update({ invoiceNumber: `INV-${order.id}` });

    const siteSettings = await SiteSetting.findByPk(1);
    const layout = req.query.layout === "thermal" ? "thermal" : "a4";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${order.id}.pdf"`);

    const doc = new PDFDocument(layout === "thermal" ? { size: [227, 800], margin: 10 } : { margin: 50 });
    doc.pipe(res);
    await renderInvoicePdf(doc, { order, siteSettings, layout });
    doc.end();
  } catch (err) {
    console.error("Admin invoice error:", err.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
});

// GET /:id/invoice/data — JSON shape consumed directly by the existing
// admin/frontend/src/pages/Invoice.jsx design (shared with Sale Bills).
// Real per-item HSN/GST (via enrichItems) instead of the old hardcoded 18%,
// and the real INV-<id> invoice number instead of the client-synthesized one.
router.get("/:id/invoice/data", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.invoiceNumber) await order.update({ invoiceNumber: `INV-${order.id}` });

    const rawItems = parseJsonField(order.items, []);
    const enriched = await enrichItems(rawItems);
    const shippingAddress = parseJsonField(order.shippingAddress, {}) || {};
    const billingAddress = parseJsonField(order.billingAddress, null) || shippingAddress;
    const [firstName, ...rest] = (order.customerName || "").split(" ");

    const toParty = (addr) => ({
      firstName: firstName || order.customerName,
      lastName: rest.join(" "),
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.postalCode,
      phone: addr.phone || order.customerPhone,
      email: order.customerEmail,
    });

    const items = enriched.map((it) => ({
      description: it.name,
      sku: it.sku,
      hsn: it.hsn,
      qty: it.qty,
      rate: Number((it.taxable / it.qty).toFixed(2)),
      gst: it.gstPercent,
      total: Number(it.total.toFixed(2)),
    }));

    const taxableAmount = enriched.reduce((s, it) => s + it.taxable, 0);
    const gstAmount = enriched.reduce((s, it) => s + it.gstAmount, 0);

    res.json({
      success: true,
      data: {
        invoiceNumber: order.invoiceNumber,
        billing: toParty(billingAddress),
        shipping: toParty(shippingAddress),
        items,
        subtotal: Number(taxableAmount.toFixed(2)),
        taxableAmount: Number(taxableAmount.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        shippingCharge: Number(order.shippingCharges || 0),
        discount: Number(order.discountAmount || 0),
        grandTotal: Number(order.totalPrice),
        paymentMethod: order.paymentMethod === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery",
        date: new Date(order.created_at).toLocaleDateString("en-IN"),
        status: order.status,
      },
    });
  } catch (err) {
    console.error("Invoice data error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load invoice data" });
  }
});

// POST /:id/invoice/email — render to a buffer, send via the existing mailer.
router.post("/:id/invoice/email", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.invoiceNumber) await order.update({ invoiceNumber: `INV-${order.id}` });

    const siteSettings = await SiteSetting.findByPk(1);
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve) => doc.on("end", resolve));
    await renderInvoicePdf(doc, { order, siteSettings, layout: "a4" });
    doc.end();
    await done;
    const pdfBuffer = Buffer.concat(chunks);

    const result = await sendMail({
      to: req.body?.to || order.customerEmail,
      subject: `Invoice ${order.invoiceNumber} — Order #${order.id}`,
      html: `<p>Hi ${order.customerName},</p><p>Please find attached the invoice for your order #${order.id}.</p><p>Thank you for shopping with us.</p>`,
      attachments: [{ filename: `invoice-${order.id}.pdf`, content: pdfBuffer }],
    });

    await logActivity(order.id, {
      type: "email",
      title: result.skipped ? "Invoice email skipped (SMTP not configured)" : "Invoice emailed to customer",
      description: req.body?.to || order.customerEmail,
      req,
    });

    res.json({ success: true, message: result.skipped ? "SMTP not configured — email skipped" : "Invoice emailed" });
  } catch (err) {
    console.error("Email invoice error:", err.message);
    res.status(500).json({ success: false, message: "Failed to email invoice" });
  }
});

// GET /:id/invoice/share-link — signed link for WhatsApp/manual sharing.
// wa.me only pre-fills text, so the frontend builds a message containing
// this URL rather than attaching a file (not possible without WhatsApp
// Business API, out of scope per the approved plan).
router.get("/:id/invoice/share-link", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const token = issueInvoiceShareToken(order.id);
    const base = `${req.protocol}://${req.get("host")}`;
    const url = `${base}/api/store/orders/${order.id}/invoice?share=${token}`;

    await logActivity(order.id, { type: "whatsapp", title: "Invoice share link generated", req });
    res.json({ success: true, data: { url, expiresIn: "48h" } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate share link" });
  }
});

// POST /:id/invoice/credit-note — credit note PDF against a refund row.
router.post("/:id/invoice/credit-note", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const { refundId } = req.body;
    const refunds = await sequelize.query("SELECT * FROM store_order_refunds WHERE id = :id AND order_id = :orderId", {
      replacements: { id: refundId, orderId: order.id }, type: QueryTypes.SELECT,
    });
    if (!refunds.length) return res.status(404).json({ success: false, message: "Refund not found for this order" });

    const siteSettings = await SiteSetting.findByPk(1);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="credit-note-${order.id}-${refundId}.pdf"`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    await renderInvoicePdf(doc, { order, siteSettings, layout: "a4", isCreditNote: true, creditAmount: refunds[0].amount });
    doc.end();

    await logActivity(order.id, {
      type: "invoice",
      title: `Credit note generated for refund #${refundId}`,
      description: `Rs. ${Number(refunds[0].amount).toFixed(2)}`,
      req,
    });
  } catch (err) {
    console.error("Credit note error:", err.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Failed to generate credit note" });
  }
});

// GET /:id/invoice/history — invoice-related activity (generated/emailed/shared).
router.get("/:id/invoice/history", async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM store_order_activity_log
       WHERE order_id = :id AND type IN ('invoice','email','whatsapp')
       ORDER BY created_at DESC`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load invoice history" });
  }
});

module.exports = router;
