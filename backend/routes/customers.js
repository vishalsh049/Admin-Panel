const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/", async (req, res) => {
  try {

   const page = Number(req.query.page) || 1;

const response = await axios.get(
  `${process.env.WOO_URL}/wp-json/wc/v3/customers?per_page=100&page=${page}`,
      {
        auth: {
          username: process.env.WOO_CONSUMER_KEY,
          password: process.env.WOO_CONSUMER_SECRET
        }
      }
    );
    const total = response.headers["x-wp-total"];

    res.json({
  success: true,
  data: response.data,
  total: Number(total),
});

  } catch (error) {

    console.error("WooCommerce API Error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Failed to fetch customers"
    });

  }
});

module.exports = router;