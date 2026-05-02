const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const hasWooCreds =
  process.env.WOO_URL &&
  process.env.WOO_CONSUMER_KEY &&
  process.env.WOO_CONSUMER_SECRET;

const WooCommerce = hasWooCreds
  ? new WooCommerceRestApi({
      url: process.env.WOO_URL,
      consumerKey: process.env.WOO_CONSUMER_KEY,
      consumerSecret: process.env.WOO_CONSUMER_SECRET,
      version: "wc/v3",
    })
  : null;

module.exports = WooCommerce;
