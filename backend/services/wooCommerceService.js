// WooCommerce/WordPress import source. The /wc/v3 product endpoints are a
// TEMPORARY one-time migration; the /wp/v2 blog-post fetcher backs the
// recurring "Sync Blogs" action (services/wpBlogSyncService.js), so WOO_URL
// must stay configured for as long as blog syncing is used. Either way this
// app only ever reads from WordPress — never a live/two-way sync target.
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

// WordPress core REST client (blog posts live under /wp-json/wp/v2, not the
// WooCommerce /wc/v3 namespace). Published posts are public, so no auth is
// needed — only WOO_URL is reused.
function getWpClient() {
  const baseURL = (process.env.WOO_URL || "").trim().replace(/\/+$/, "");
  if (!baseURL) {
    throw new Error("WordPress is not configured — set WOO_URL in .env");
  }
  return axios.create({ baseURL: `${baseURL}/wp-json/wp/v2`, timeout: 30000 });
}

// All published blog posts with author, featured image, and category/tag
// terms embedded. Paginates via the X-WP-TotalPages header because WordPress
// returns a 400 (rest_post_invalid_page_number) for a page past the end,
// unlike WooCommerce's empty-batch behaviour fetchAllPages relies on.
async function fetchAllBlogPosts() {
  const client = getWpClient();
  const results = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await client.get("/posts", {
      params: {
        status: "publish",
        per_page: PER_PAGE,
        page,
        _embed: "author,wp:featuredmedia,wp:term",
      },
    });
    results.push(...(res.data || []));
    totalPages = Math.min(Number(res.headers["x-wp-totalpages"]) || 1, 200);
    page += 1;
  } while (page <= totalPages);
  return results;
}

module.exports = {
  testConnection,
  fetchAllCategories,
  fetchAllProducts,
  fetchProductVariations,
  fetchAllBlogPosts,
  describeError,
};
