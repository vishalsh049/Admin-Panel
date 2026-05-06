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

    name: product.name || "",

    description: product.description || "",

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

    stock_status: product.stock_status || "",

    status: normalizeStatus(product.status),

    source: normalizeSource(product.source),

    brand: product.brand || "",

    color: product.color || "",

    size: product.size || "",

    hsn: product.hsn || "",

    tax_class: product.tax_class || "",

    tax_status: product.tax_status || "",

    weight: product.weight || 0,

    length: product.length || 0,

    width: product.width || 0,

    height: product.height || 0,

    image: product.image || "",

    created_at: product.created_at,

    updated_at: product.updated_at,
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
  name: row.Name || row.name || "",

  description:
    row.Description || row.description || "",

  regular_price:
    row["Regular Price"] ||
    row.regular_price ||
    row.Price ||
    row.price ||
    0,

  sale_price:
    row["Sale Price"] ||
    row.sale_price ||
    0,

  category:
    row.Category ||
    row.category ||
    "",

  sku: sku || "",

  stock:
    Number(row.Stock || row.stock || 0),

  stock_status:
    Number(row.Stock || row.stock || 0) > 0
      ? "in_stock"
      : "out_of_stock",

  status:
    row.Status ||
    row.status ||
    "publish",

  source: "admin",

  brand:
    row.Brand ||
    row.brand ||
    "",

  color:
    row.Color ||
    row.color ||
    "",

  size:
    row.Size ||
    row.size ||
    "",

  hsn:
    row.HSN ||
    row.hsn ||
    "",

  tax_class:
    row["Tax Class"] ||
    row.tax_class ||
    "",

  tax_status:
    row["Tax Status"] ||
    row.tax_status ||
    "taxable",

  weight:
    Number(row.Weight || row.weight || 0),

  length:
    Number(row.Length || row.length || 0),

  width:
    Number(row.Width || row.width || 0),

  height:
    Number(row.Height || row.height || 0),

  image:
    row.Image ||
    row.image ||
    "",
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
  stock_status,
  status,
  source,

  weight,
  length,
  width,
  height,

  color,
  size,
  brand,

  hsn,
  tax_class,
  tax_status,

  image,
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

  category: Array.isArray(categories)
    ? categories.join(", ")
    : categories || "",

  sku,

  stock: Number(stock) || 0,

  stock_status:
  stock_status ||
  (Number(stock) > 0
    ? "in_stock"
    : "out_of_stock"),

  status: status || "publish",

  source: source || "admin",

  weight: Number(weight) || 0,
  length: Number(length) || 0,
  width: Number(width) || 0,
  height: Number(height) || 0,

  color: color || "",
  size: size || "",
  brand: brand || "",

  hsn: hsn || "",
  tax_class: tax_class || "",
  tax_status: tax_status || "taxable",

  image: image || "",
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
  req.body.stock_status ||
  (Number(req.body.stock) > 0
    ? "in_stock"
    : "out_of_stock"),
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