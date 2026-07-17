// TEMPORARY WooCommerce integration — used only to migrate existing products
// into this app's own MySQL database. Not a live/ongoing sync target; once
// the migration is done, WOO_* env vars and this file can be removed.
const axios = require("axios");

const PER_PAGE = 100;

function getClient() {
  const baseURL = (process.env.WOO_URL || "").trim().replace(/\/+$/, "");
  const consumerKey = (process.env.WOO_CONSUMER_KEY || "").trim();
  const consumerSecret = (process.env.WOO_CONSUMER_SECRET || "").trim();

  if (!baseURL || !consumerKey || !consumerSecret) {
    throw new Error(
      "WooCommerce is not configured — set WOO_URL, WOO_CONSUMER_KEY, and WOO_CONSUMER_SECRET in .env"
    );
  }

  return axios.create({
    baseURL: `${baseURL}/wp-json/wc/v3`,
    auth: { username: consumerKey, password: consumerSecret },
    timeout: 30000,
  });
}

function describeError(err) {
  if (err.response) {
    const status = err.response.status;
    const wooMessage = err.response.data?.message;
    if (status === 401) {
      return "WooCommerce rejected the consumer key/secret (401 Unauthorized) — check WOO_CONSUMER_KEY/WOO_CONSUMER_SECRET.";
    }
    if (status === 404) {
      return "WooCommerce REST API not found at this URL (404) — check WOO_URL and that WooCommerce REST API is enabled.";
    }
    return `WooCommerce API error (${status}): ${wooMessage || err.message}`;
  }
  if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
    return `Could not reach WOO_URL (${err.code}) — check the URL is correct and reachable.`;
  }
  if (err.code === "ECONNABORTED") {
    return "WooCommerce request timed out.";
  }
  return err.message || String(err);
}

async function testConnection() {
  try {
    const client = getClient();
    const res = await client.get("/products", { params: { per_page: 1 } });
    const totalProducts = Number(res.headers["x-wp-total"] || res.data.length || 0);
    return { success: true, message: "Connected to WooCommerce successfully.", totalProducts };
  } catch (err) {
    return { success: false, message: describeError(err) };
  }
}

async function fetchAllPages(client, endpoint, params = {}) {
  const results = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.get(endpoint, { params: { ...params, per_page: PER_PAGE, page } });
    const batch = res.data || [];
    results.push(...batch);
    if (batch.length < PER_PAGE) break;
    page += 1;
    if (page > 200) break; // hard safety cap (20k items) against a runaway loop
  }
  return results;
}

async function fetchAllCategories() {
  const client = getClient();
  return fetchAllPages(client, "/products/categories");
}

async function fetchAllProducts() {
  const client = getClient();
  return fetchAllPages(client, "/products", { status: "any" });
}

async function fetchProductVariations(productId) {
  const client = getClient();
  return fetchAllPages(client, `/products/${productId}/variations`);
}

module.exports = {
  testConnection,
  fetchAllCategories,
  fetchAllProducts,
  fetchProductVariations,
  describeError,
};
