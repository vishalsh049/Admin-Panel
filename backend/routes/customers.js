const express = require("express");
const router = express.Router();
const StoreCustomer = require("../models/StoreCustomer");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");

router.use(adminAuth, requirePermission("customers"));

router.get("/", async (req, res) => {
  try {
    const customers = await StoreCustomer.findAll({
      attributes: ["id", "name", "email", "phone", "created_at"],
      order: [["created_at", "DESC"]],
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

module.exports = router;
