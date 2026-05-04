const express = require("express");
const axios = require("axios");
const Product = require("../models/Products");
const multer = require("multer");
const xlsx = require("xlsx");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ---------------- HELPERS ----------------
const normalizeStatus = (status = "publish") => {
  const value = String(status).trim().toLowerCase();
  return value === "draft" ? "draft" : "publish";
};

const normalizeSource = (source = "admin") => {
  return source === "woocommerce" ? "woocommerce" : "admin";
};

const serializeProduct = (productInstance) => {
  const product = productInstance.toJSON();

 return {
  id: product.id,
  name: product.name,

  regular_price:
  product.regular_price === null ||
  product.regular_price === "" ||
  isNaN(product.regular_price)
    ? 0
    : Number(product.regular_price),

    sale_price:
      product.sale_price === null ||
      product.sale_price === "" ||
      isNaN(product.sale_price)
        ? null
        : Number(product.sale_price),

  category: product.category || "",
  sku: product.sku || "",
  stock: Number(product.stock || 0),
  stock_status: product.stock_status,
  status: normalizeStatus(product.status),
  source: normalizeSource(product.source),
  created_at: product.created_at,
};
};

// ---------------- IMPORT PRODUCTS ----------------
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let inserted = 0;
    let skipped = 0;

    const productsToInsert = [];

    for (const row of data) {
      const sku = row.SKU || row.sku;

      // ✅ Skip duplicate SKU
      if (sku) {
        const exists = await Product.findOne({ where: { sku } });
        if (exists) {
          skipped++;
          continue;
        }
      }

      productsToInsert.push({
        name: row.Name || row.name,
        regular_price: row.Price || row.price || 0,
        category: row.Category || row.category || "",
        sku: sku || "",
        stock: 0,
        status: "publish",
        source: "admin",
      });
    }

    if (productsToInsert.length > 0) {
      await Product.bulkCreate(productsToInsert);
      inserted = productsToInsert.length;
    }

    return res.json({
      success: true,
      message: "Import completed",
      inserted,
      skipped,
      total: data.length,
    });

  } catch (error) {
    console.error("IMPORT ERROR:", error);
    return res.status(500).json({ error: "Import failed" });
  }
});

// ---------------- GET ALL PRODUCTS ----------------
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [["created_at", "DESC"]],
    });

    return res.json({
      success: true,
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ---------------- GET SINGLE ----------------
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({
      success: true,
      product: serializeProduct(product),
    });
  } catch (error) {
    return res.status(500).json({ error: "Error fetching product" });
  }
});

// ---------------- CREATE ----------------
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      regular_price,
      sale_price,
      categories,
      sku,
      stock,
      status,
      source,
    } = req.body;

    const newProduct = await Product.create({
      name,
      description: description || "",
      regular_price:
        regular_price === "" || regular_price === undefined
           ? 0
          : Number(regular_price),

   sale_price:
    sale_price === "" || sale_price === undefined
      ? null
      : Number(sale_price),

      // ✅ convert array → string
      category: Array.isArray(categories)
        ? categories.join(", ")
        : categories || "",

      sku,
      stock: Number(stock) || 0,
      stock_status:
       Number(stock) > 0 ? "in_stock" : "out_of_stock",
      status: status || "publish",
      source: source || "admin",
    });

    return res.json({
      success: true,
      message: "Product created",
      product: serializeProduct(newProduct),
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);
    return res.status(500).json({ error: "Create failed" });
  }
});

// ---------------- UPDATE ----------------
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await product.update({
      name: req.body.name,
      regular_price:
      req.body.regular_price === "" || req.body.regular_price === undefined
        ? 0
       : Number(req.body.regular_price),
      description: req.body.description,
      category: Array.isArray(req.body.categories)
        ? req.body.categories.join(", ")
        : req.body.category,
      sku: req.body.sku,
      stock: Number(req.body.stock) || 0,

stock_status:
  Number(req.body.stock) > 0 ? "in_stock" : "out_of_stock",
    });

    return res.json({ success: true, message: "Updated" });
  } catch (error) {
    return res.status(500).json({ error: "Update failed" });
  }
});

// ---------------- DELETE ----------------
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await product.destroy();

    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;