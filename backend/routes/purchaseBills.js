const express = require("express");
const router = express.Router();
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");

// GET ALL PURCHASE BILLS
router.get("/", async (req, res) => {
  try {
    const bills = await sequelize.query(
      "SELECT * FROM purchase_bills ORDER BY id DESC",
      { type: QueryTypes.SELECT }
    );

    res.json(bills);
  } catch (error) {
    console.error("PURCHASE BILL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;