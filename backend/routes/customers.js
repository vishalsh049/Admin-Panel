const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/", async (req, res) => {
  try {

    const response = await axios.get(
      `${process.env.WOO_URL}/wp-json/wc/v3/customers?per_page=100`,
      {
        auth: {
          username: process.env.WOO_CONSUMER_KEY,
          password: process.env.WOO_CONSUMER_SECRET
        }
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error("WooCommerce API Error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Failed to fetch customers"
    });

  }
});

module.exports = router;