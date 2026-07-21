const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { Op } = require("sequelize");
const StoreCustomer = require("../models/StoreCustomer");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");

router.use(adminAuth, requirePermission("customers"));

router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
          ],
        }
      : undefined;

    const customers = await StoreCustomer.findAll({
      where,
      attributes: ["id", "name", "email", "phone", "created_at"],
      order: [["created_at", "DESC"]],
      limit: search ? 20 : undefined,
    });

    res.json({
      success: true,
      data: customers,
      total: customers.length,
    });
  } catch (error) {
    console.error("Customers fetch error:", error.message);

    res.status(500).json({
      message: "Failed to fetch customers",
    });
  }
});

// POST /api/customers — quick-create, used by POS for walk-in customers.
// Email is optional (no login is expected via this path); a random password
// is generated so the account still satisfies StoreCustomer's constraints
// and the customer can use "forgot password" later if they want storefront access.
router.post("/", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const phone = (req.body.phone || "").trim();
    const email = (req.body.email || "").trim() || null;

    if (!name) return res.status(400).json({ message: "Customer name is required" });
    if (!phone && !email) return res.status(400).json({ message: "Phone or email is required" });

    if (email) {
      const existing = await StoreCustomer.findOne({ where: { email } });
      if (existing) return res.status(409).json({ message: "A customer with this email already exists" });
    }

    const customer = await StoreCustomer.create({
      name,
      phone: phone || null,
      email,
      password: crypto.randomBytes(16).toString("hex"),
    });

    res.status(201).json({
      success: true,
      data: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, created_at: customer.created_at },
    });
  } catch (error) {
    console.error("Customer create error:", error.message);
    res.status(500).json({ message: "Failed to create customer" });
  }
});

module.exports = router;
