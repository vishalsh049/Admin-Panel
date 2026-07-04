const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const Product = require("../models/Products");
const StoreCustomer = require("../models/StoreCustomer");
const StoreOrder = require("../models/StoreOrder");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";

// ─── Customer Auth Middleware ──────────────────────────────────────────────────
function customerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "customer") {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.customerId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Token failed" });
  }
}

// ─── PRODUCTS (public) ────────────────────────────────────────────────────────

// GET /api/store/products
router.get("/products", async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    const where = { status: "publish" };
    if (category && category !== "All Categories") {
      where.category = { [Op.like]: `%${category}%` };
    }
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    let order = [["created_at", "DESC"]];
    if (sort === "price_asc") order = [["regular_price", "ASC"]];
    if (sort === "price_desc") order = [["regular_price", "DESC"]];

    const products = await Product.findAll({ where, order });

    const mapped = products.map(formatProduct);
    res.json(mapped);
  } catch (err) {
    console.error("Store products error:", err.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET /api/store/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || product.status !== "publish") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(formatProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CUSTOMER AUTH ────────────────────────────────────────────────────────────

// POST /api/store/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await StoreCustomer.findOne({ where: { email: email.toLowerCase() } });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const customer = await StoreCustomer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    const token = jwt.sign({ id: customer.id, type: "customer" }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      token,
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /api/store/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const customer = await StoreCustomer.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!customer) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await customer.matchPassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: customer.id, type: "customer" }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// GET /api/store/auth/profile  (protected)
router.get("/auth/profile", customerAuth, async (req, res) => {
  try {
    const customer = await StoreCustomer.findByPk(req.customerId, {
      attributes: ["id", "name", "email", "phone", "created_at"],
    });
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────

// POST /api/store/orders  (protected – place an order)
router.post("/orders", customerAuth, async (req, res) => {
  try {
    const { items, shippingAddress, totalPrice, paymentMethod } = req.body;
    if (!items || !shippingAddress || !totalPrice) {
      return res.status(400).json({ message: "items, shippingAddress and totalPrice are required" });
    }

    const customer = await StoreCustomer.findByPk(req.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const order = await StoreOrder.create({
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: shippingAddress.phone || null,
      items,
      shippingAddress,
      totalPrice,
      paymentMethod: paymentMethod || "cod",
      status: "pending",
    });

    res.status(201).json({ message: "Order placed successfully", orderId: order.id });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// GET /api/store/orders/my  (protected – customer's own orders)
router.get("/orders/my", customerAuth, async (req, res) => {
  try {
    const orders = await StoreOrder.findAll({
      where: { customerId: req.customerId },
      order: [["created_at", "DESC"]],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN: view all website orders ──────────────────────────────────────────

// GET /api/store/admin/orders
router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await StoreOrder.findAll({
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: orders, total: orders.length });
  } catch (err) {
    console.error("Admin store orders error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch store orders" });
  }
});

// GET /api/store/admin/orders/:id
router.get("/admin/orders/:id", async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("Admin store order details error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
});

// PATCH /api/store/admin/orders/:id/status  — update order status
router.patch("/admin/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    await order.update({ status });
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatProduct(p) {
  const data = p.toJSON();
  const price = data.sale_price && Number(data.sale_price) > 0
    ? Number(data.sale_price)
    : Number(data.regular_price || 0);

  return {
    id: data.id,
    name: data.name || "",
    description: data.description || "",
    price,                                    // website frontend uses `price`
    regular_price: Number(data.regular_price || 0),
    sale_price: data.sale_price ? Number(data.sale_price) : null,
    image: data.image || "",
    category: data.category || "",
    stock: Number(data.stock || 0),
    stock_status: data.stock_status || "in_stock",
    sku: data.sku || "",
    brand: data.brand || "",
    rating: 0,       // website frontend StarRating uses this
    numReviews: 0,
    created_at: data.created_at,
  };
}

module.exports = router;
