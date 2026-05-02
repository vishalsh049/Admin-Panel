const express = require("express");
const WooCommerce = require("../config/woocommerce");
const Product = require("../models/Products");

const router = express.Router();

const normalizeStatus = (status = "publish") => String(status).toLowerCase();

const normalizeStockStatus = (status = "instock") => {
  const value = String(status).toLowerCase().trim();

  if (value === "in stock") return "instock";
  if (value === "out of stock") return "outofstock";

  return value || "instock";
};

const buildProductKey = (product) => {
  const sku = String(product?.sku || "").trim().toLowerCase();
  if (sku) return `sku:${sku}`;

  const name = String(product?.name || "").trim().toLowerCase();
  return name ? `name:${name}` : null;
};

const normalizeLocalProduct = (productInstance) => {
  const product = productInstance.toJSON();
  const categories = [product.category]
    .filter(Boolean)
    .map((name) => ({ name }));

  const salePrice =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    Number(product.salePrice) > 0
      ? String(product.salePrice)
      : "";

  return {
    ...product,
    status: normalizeStatus(product.status || "publish"),
    source: product.source || "admin",
    price: String(product.price || 0),
    regular_price: String(product.price || 0),
    sale_price: salePrice,
    stock_quantity: product.stock || 0,
    stock_status: normalizeStockStatus(product.stock > 0 ? "instock" : "outofstock"),
    categories,
    images: [],
  };
};

const normalizeWooProduct = (product) => ({
  ...product,
  source: "woocommerce",
  status: normalizeStatus(product.status),
});

async function fetchAllWooProducts() {
  if (!WooCommerce) return [];

  let allProducts = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await WooCommerce.get("products", {
      per_page: 100,
      page: currentPage,
      status: "any",
    });

    allProducts = [...allProducts, ...((response.data || []).map(normalizeWooProduct))];
    totalPages = parseInt(response.headers?.["x-wp-totalpages"] || 1, 10);
    currentPage++;
  } while (currentPage <= totalPages);

  return allProducts;
}

router.get("/products", async (req, res) => {
  try {
    const isAll = req.query.all === "true";
    const page = parseInt(req.query.page, 10) || 1;

    if (isAll) {
      const localProducts = await Product.findAll({
        order: [["created_at", "DESC"]],
      });

      const normalizedLocalProducts = localProducts.map(normalizeLocalProduct);
      const localKeys = new Set(
        normalizedLocalProducts
          .map(buildProductKey)
          .filter(Boolean)
      );

      const wooProducts = await fetchAllWooProducts();
      const filteredWooProducts = wooProducts.filter((product) => {
        const key = buildProductKey(product);
        return !key || !localKeys.has(key);
      });

      const mergedProducts = [...normalizedLocalProducts, ...filteredWooProducts].sort(
        (a, b) => {
          const aDate = new Date(
            a.date_created || a.createdAt || a.updatedAt || 0
          ).getTime();
          const bDate = new Date(
            b.date_created || b.createdAt || b.updatedAt || 0
          ).getTime();

          return bDate - aDate;
        }
      );

      return res.json({
        products: mergedProducts,
        total: mergedProducts.length,
      });
    }

    if (!WooCommerce) {
      return res.status(400).json({ error: "WooCommerce not configured" });
    }

    const response = await WooCommerce.get("products", {
      per_page: 10,
      page,
      status: "any",
    });

    res.json({
      products: (response.data || []).map(normalizeWooProduct),
      total: parseInt(response.headers?.["x-wp-total"] || 0, 10),
      totalPages: parseInt(response.headers?.["x-wp-totalpages"] || 1, 10),
      currentPage: page,
    });
  } catch (error) {
    console.error("Product fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.put("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!WooCommerce) {
      return res.status(400).json({ error: "WooCommerce not configured" });
    }

    const response = await WooCommerce.put(`products/${id}`, req.body);
    res.json({
      ...response.data,
      source: "woocommerce",
    });
  } catch (error) {
    console.error("Woo update error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to update product",
      details: error.response?.data,
    });
  }
});

router.get("/orders", async (req, res) => {
  try {
    if (!WooCommerce) {
      return res.status(400).json({ error: "WooCommerce not configured" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const search = req.query.search || "";

    const response = await WooCommerce.get("orders", {
      per_page: 10,
      page,
      status: "any",
      orderby: "date",
      order: "desc",
      ...(search ? { search } : {}),
    });

    res.json({
      orders: response.data || [],
      total: parseInt(response.headers?.["x-wp-total"] || 0, 10),
      totalPages: parseInt(response.headers?.["x-wp-totalpages"] || 1, 10),
      currentPage: page,
    });
  } catch (error) {
    console.error("Order fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;
