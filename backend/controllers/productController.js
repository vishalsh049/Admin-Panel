const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const xlsx = require("xlsx");
const sequelize = require("../config/db");
const {
  Product,
  Category,
  ProductImage,
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
  ProductVariationAttributeValue,
} = require("../models");
const { buildProductPayload } = require("../utils/serializers/productSerializer");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");
const slugify = require("../utils/slugify");
const productUpload = require("../middleware/productUpload");

const PRODUCT_INCLUDE = [
  { model: Category, as: "categoryRef" },
  { model: ProductImage, as: "images" },
];

const PRODUCT_INCLUDE_FULL = [
  ...PRODUCT_INCLUDE,
  {
    model: ProductAttribute,
    as: "attributes",
    include: [{ model: ProductAttributeValue, as: "values" }],
  },
  {
    model: ProductVariation,
    as: "variations",
    include: [{ model: ProductAttributeValue, as: "attributeValues" }],
  },
];

function safeUnlink(relativePath) {
  if (!relativePath) return;
  try {
    const normalized = toRelativeUploadPath(relativePath);
    if (!normalized.startsWith("/uploads/")) return;
    const absolute = path.join(__dirname, "..", normalized);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (error) {
    console.warn("Failed to remove upload file:", relativePath, error.message);
  }
}

async function generateUniqueSlug(name, excludeId = null) {
  const base = slugify(name) || `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  // Small catalog — a loop of exact-match lookups is simple and safe.
  while (
    await Product.findOne({
      where: excludeId
        ? { slug: candidate, id: { [Op.ne]: excludeId } }
        : { slug: candidate },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function numOrDefault(value, fallback) {
  if (value === "" || value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

// ---------------- LIST ----------------
exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.stock_status) where.stock_status = req.query.stock_status;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { sku: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const sortMap = {
      name_asc: [["name", "ASC"]],
      name_desc: [["name", "DESC"]],
      price_asc: [["regular_price", "ASC"]],
      price_desc: [["regular_price", "DESC"]],
      stock_asc: [["stock", "ASC"]],
      stock_desc: [["stock", "DESC"]],
      oldest: [["created_at", "ASC"]],
      newest: [["created_at", "DESC"]],
    };
    const order = sortMap[req.query.sort] || sortMap.newest;

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: PRODUCT_INCLUDE,
      order,
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      products: rows.map((p) => buildProductPayload(p, { context: "admin" })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  } catch (error) {
    console.error("LIST PRODUCTS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
};

// ---------------- STATS ----------------
exports.getProductStats = async (req, res) => {
  try {
    const [total, published, draft, inStock, outOfStock, lowStock] = await Promise.all([
      Product.count(),
      Product.count({ where: { status: "publish" } }),
      Product.count({ where: { status: "draft" } }),
      Product.count({ where: { stock_status: "in_stock" } }),
      Product.count({ where: { stock_status: "out_of_stock" } }),
      Product.count({
        where: {
          stock_status: "in_stock",
          stock: { [Op.gt]: 0, [Op.lte]: sequelize.col("low_stock_threshold") },
        },
      }),
    ]);
    return res.json({ success: true, stats: { total, published, draft, inStock, outOfStock, lowStock } });
  } catch (error) {
    console.error("PRODUCT STATS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// ---------------- GET ONE ----------------
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE_FULL });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true, product: buildProductPayload(product, { context: "admin" }) });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);
    return res.status(500).json({ error: "Error fetching product" });
  }
};

function buildProductFields(body) {
  return {
    name: body.name,
    description: body.description || "",
    short_description: body.short_description || "",
    regular_price: numOrDefault(body.regular_price, 0),
    sale_price: body.sale_price === "" || body.sale_price === undefined ? null : Number(body.sale_price),
    cost_price: body.cost_price === "" || body.cost_price === undefined ? null : Number(body.cost_price),
    low_stock_threshold: numOrDefault(body.low_stock_threshold, 5),
    category_id: body.category_id || null,
    category: body.category || "",
    sku: body.sku || "",
    stock: numOrDefault(body.stock, 0),
    stock_status:
      body.stock_status || (numOrDefault(body.stock, 0) > 0 ? "in_stock" : "out_of_stock"),
    status: body.status || "publish",
    source: body.source || "admin",
    weight: numOrDefault(body.weight, 0),
    length: numOrDefault(body.length, 0),
    width: numOrDefault(body.width, 0),
    height: numOrDefault(body.height, 0),
    color: body.color || "",
    size: body.size || "",
    brand: body.brand || "",
    hsn: body.hsn || "",
    tax_class: body.tax_class || "",
    tax_status: body.tax_status || "taxable",
    seo_title: body.seo_title || "",
    seo_description: body.seo_description || "",
    seo_keywords: body.seo_keywords || "",
    is_featured: !!body.is_featured,
    is_best_seller: !!body.is_best_seller,
    is_new_arrival: !!body.is_new_arrival,
    is_trending: !!body.is_trending,
    has_variations: !!body.has_variations,
  };
}

// ---------------- CREATE ----------------
exports.createProduct = async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const fields = buildProductFields(req.body);

    if (fields.category_id) {
      const category = await Category.findByPk(fields.category_id);
      if (!category) return res.status(400).json({ error: "Selected category does not exist" });
      fields.category = category.name;
    }

    fields.slug = await generateUniqueSlug(req.body.slug || req.body.name);

    const primaryImage = req.body.image ? toRelativeUploadPath(req.body.image) : null;
    if (primaryImage) fields.image = primaryImage;

    const newProduct = await Product.create(fields);

    const galleryPaths = Array.isArray(req.body.images) ? req.body.images : [];
    const allImages = primaryImage ? [primaryImage, ...galleryPaths.filter((p) => p !== primaryImage)] : galleryPaths;
    for (let i = 0; i < allImages.length; i++) {
      await ProductImage.create({
        product_id: newProduct.id,
        image_path: toRelativeUploadPath(allImages[i]),
        is_primary: i === 0,
        sort_order: i,
      });
    }

    const saved = await Product.findByPk(newProduct.id, { include: PRODUCT_INCLUDE_FULL });
    return res.json({
      success: true,
      message: "Product created",
      product: buildProductPayload(saved, { context: "admin" }),
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return res.status(500).json({ error: "Create failed" });
  }
};

// ---------------- UPDATE ----------------
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const fields = buildProductFields(req.body);

    if (fields.category_id) {
      const category = await Category.findByPk(fields.category_id);
      if (!category) return res.status(400).json({ error: "Selected category does not exist" });
      fields.category = category.name;
    }

    if (req.body.slug && req.body.slug.trim() && req.body.slug.trim() !== product.slug) {
      fields.slug = await generateUniqueSlug(req.body.slug, product.id);
    } else {
      delete fields.slug;
    }

    if (req.body.image) {
      fields.image = toRelativeUploadPath(req.body.image);
    }

    await product.update(fields);

    return res.json({ success: true, message: "Updated" });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    return res.status(500).json({ error: "Update failed" });
  }
};

async function deleteProductImages(productId) {
  const images = await ProductImage.findAll({ where: { product_id: productId } });
  images.forEach((img) => safeUnlink(img.image_path));
}

// ---------------- DELETE ----------------
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await deleteProductImages(product.id);
    await product.destroy();

    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    return res.status(500).json({ error: "Delete failed" });
  }
};

// ---------------- BULK DELETE ----------------
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ error: "No product ids provided" });

    for (const id of ids) {
      await deleteProductImages(id);
    }

    const deleted = await Product.destroy({ where: { id: { [Op.in]: ids } } });
    return res.json({ success: true, deleted });
  } catch (error) {
    console.error("BULK DELETE ERROR:", error);
    return res.status(500).json({ error: "Bulk delete failed" });
  }
};

// ---------------- EXPORT ----------------
exports.exportProducts = async (req, res) => {
  try {
    const where = {};
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) where.name = { [Op.like]: `%${req.query.search}%` };

    const products = await Product.findAll({ where, include: PRODUCT_INCLUDE, order: [["created_at", "DESC"]] });
    const rows = products.map((p) => buildProductPayload(p, { context: "admin" }));

    const fields = [
      "id", "name", "sku", "category", "regular_price", "sale_price",
      "stock", "stock_status", "status", "brand", "image",
    ];
    const csvRows = rows.map((row) => Object.fromEntries(fields.map((f) => [f, row[f]])));
    const worksheet = xlsx.utils.json_to_sheet(csvRows, { header: fields });
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    res.header("Content-Type", "text/csv");
    res.attachment(`products-export-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error("EXPORT PRODUCTS ERROR:", error);
    return res.status(500).json({ error: "Export failed" });
  }
};

// ---------------- IMPORT ----------------
exports.importProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const skusInFile = data.map((row) => row.SKU || row.sku).filter(Boolean);
    const existing = skusInFile.length
      ? await Product.findAll({ where: { sku: { [Op.in]: skusInFile } }, attributes: ["sku"] })
      : [];
    const existingSkus = new Set(existing.map((p) => p.sku));

    let inserted = 0;
    let skipped = 0;
    const productsToInsert = [];

    for (const row of data) {
      const sku = row.SKU || row.sku;
      if (sku && existingSkus.has(sku)) {
        skipped++;
        continue;
      }
      if (sku) existingSkus.add(sku);

      productsToInsert.push({
        name: row.Name || row.name || "",
        description: row.Description || row.description || "",
        regular_price: row["Regular Price"] || row.regular_price || row.Price || row.price || 0,
        sale_price: row["Sale Price"] || row.sale_price || 0,
        category: row.Category || row.category || "",
        sku: sku || "",
        stock: Number(row.Stock || row.stock || 0),
        stock_status: Number(row.Stock || row.stock || 0) > 0 ? "in_stock" : "out_of_stock",
        status: row.Status || row.status || "publish",
        source: "admin",
        brand: row.Brand || row.brand || "",
        color: row.Color || row.color || "",
        size: row.Size || row.size || "",
        hsn: row.HSN || row.hsn || "",
        tax_class: row["Tax Class"] || row.tax_class || "",
        tax_status: row["Tax Status"] || row.tax_status || "taxable",
        weight: Number(row.Weight || row.weight || 0),
        length: Number(row.Length || row.length || 0),
        width: Number(row.Width || row.width || 0),
        height: Number(row.Height || row.height || 0),
        image: row.Image || row.image || "",
        slug: null,
      });
    }

    if (productsToInsert.length > 0) {
      for (const p of productsToInsert) {
        p.slug = await generateUniqueSlug(p.name);
      }
      await Product.bulkCreate(productsToInsert);
      inserted = productsToInsert.length;
    }

    return res.json({ success: true, message: "Import completed", inserted, skipped, total: data.length });
  } catch (error) {
    console.error("IMPORT ERROR:", error);
    return res.status(500).json({ error: "Import failed" });
  } finally {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Failed to remove import temp file:", req.file.path, err.message);
      });
    }
  }
};

// ---------------- IMAGES ----------------
exports.uploadPrimaryImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  return res.json({ success: true, path: productUpload.relativePath(req.file.filename) });
};

exports.addImages = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No images uploaded" });

    const existingCount = await ProductImage.count({ where: { product_id: product.id } });
    const hasPrimaryAlready = existingCount > 0;

    const created = [];
    for (let i = 0; i < req.files.length; i++) {
      const img = await ProductImage.create({
        product_id: product.id,
        image_path: productUpload.relativePath(req.files[i].filename),
        is_primary: !hasPrimaryAlready && i === 0,
        sort_order: existingCount + i,
      });
      created.push(img);
    }

    const allImages = await ProductImage.findAll({ where: { product_id: product.id }, order: [["sort_order", "ASC"]] });
    return res.json({ success: true, images: allImages });
  } catch (error) {
    console.error("ADD IMAGES ERROR:", error);
    return res.status(500).json({ error: "Failed to add images" });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const image = await ProductImage.findOne({
      where: { id: req.params.imageId, product_id: req.params.id },
    });
    if (!image) return res.status(404).json({ error: "Image not found" });

    const wasPrimary = image.is_primary;
    safeUnlink(image.image_path);
    await image.destroy();

    if (wasPrimary) {
      const next = await ProductImage.findOne({
        where: { product_id: req.params.id },
        order: [["sort_order", "ASC"]],
      });
      if (next) await next.update({ is_primary: true });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE IMAGE ERROR:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
};

exports.setPrimaryImage = async (req, res) => {
  try {
    const image = await ProductImage.findOne({
      where: { id: req.params.imageId, product_id: req.params.id },
    });
    if (!image) return res.status(404).json({ error: "Image not found" });

    await ProductImage.update({ is_primary: false }, { where: { product_id: req.params.id } });
    await image.update({ is_primary: true });

    return res.json({ success: true });
  } catch (error) {
    console.error("SET PRIMARY IMAGE ERROR:", error);
    return res.status(500).json({ error: "Failed to set primary image" });
  }
};

exports.reorderImages = async (req, res) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    for (let i = 0; i < order.length; i++) {
      await ProductImage.update(
        { sort_order: i },
        { where: { id: order[i], product_id: req.params.id } }
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("REORDER IMAGES ERROR:", error);
    return res.status(500).json({ error: "Failed to reorder images" });
  }
};

// ---------------- ATTRIBUTES ----------------
exports.getAttributes = async (req, res) => {
  try {
    const attributes = await ProductAttribute.findAll({
      where: { product_id: req.params.id },
      include: [{ model: ProductAttributeValue, as: "values" }],
      order: [["sort_order", "ASC"]],
    });
    return res.json({ success: true, attributes });
  } catch (error) {
    console.error("GET ATTRIBUTES ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch attributes" });
  }
};

exports.saveAttributes = async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const attributes = Array.isArray(req.body.attributes) ? req.body.attributes : [];
  const t = await sequelize.transaction();
  try {
    await ProductAttribute.destroy({ where: { product_id: product.id }, transaction: t });

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (!attr.name || !attr.name.trim()) continue;

      const created = await ProductAttribute.create(
        {
          product_id: product.id,
          name: attr.name.trim(),
          sort_order: i,
          is_for_variations: attr.is_for_variations !== false,
        },
        { transaction: t }
      );

      const values = Array.isArray(attr.values) ? attr.values : [];
      for (let j = 0; j < values.length; j++) {
        const val = String(values[j]).trim();
        if (!val) continue;
        await ProductAttributeValue.create(
          { attribute_id: created.id, value: val, sort_order: j },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const saved = await ProductAttribute.findAll({
      where: { product_id: product.id },
      include: [{ model: ProductAttributeValue, as: "values" }],
      order: [["sort_order", "ASC"]],
    });
    return res.json({ success: true, attributes: saved });
  } catch (error) {
    await t.rollback();
    console.error("SAVE ATTRIBUTES ERROR:", error);
    return res.status(500).json({ error: "Failed to save attributes" });
  }
};

// ---------------- VARIATIONS ----------------
exports.getVariations = async (req, res) => {
  try {
    const variations = await ProductVariation.findAll({
      where: { product_id: req.params.id },
      include: [{ model: ProductAttributeValue, as: "attributeValues" }],
      order: [["id", "ASC"]],
    });
    return res.json({ success: true, variations });
  } catch (error) {
    console.error("GET VARIATIONS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch variations" });
  }
};

exports.generateVariations = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const attributes = await ProductAttribute.findAll({
      where: { product_id: product.id, is_for_variations: true },
      include: [{ model: ProductAttributeValue, as: "values" }],
      order: [["sort_order", "ASC"]],
    });

    const usableAttributes = attributes.filter((a) => a.values && a.values.length > 0);
    if (usableAttributes.length === 0) {
      return res.status(400).json({ error: "Add at least one attribute with values before generating variations" });
    }

    let combinations = [[]];
    for (const attr of usableAttributes) {
      const next = [];
      for (const combo of combinations) {
        for (const value of attr.values) {
          next.push([...combo, { attributeId: attr.id, valueId: value.id, valueLabel: value.value }]);
        }
      }
      combinations = next;
    }

    const existingVariations = await ProductVariation.findAll({
      where: { product_id: product.id },
      include: [{ model: ProductAttributeValue, as: "attributeValues" }],
    });
    const existingKeys = new Set(
      existingVariations.map((v) =>
        (v.attributeValues || []).map((av) => av.id).sort((a, b) => a - b).join("-")
      )
    );

    let created = 0;
    for (const combo of combinations) {
      const key = combo.map((c) => c.valueId).sort((a, b) => a - b).join("-");
      if (existingKeys.has(key)) continue;

      const labelSuffix = combo.map((c) => c.valueLabel).join("-");
      const variation = await ProductVariation.create({
        product_id: product.id,
        sku: product.sku ? `${product.sku}-${slugify(labelSuffix)}` : null,
        regular_price: 0,
        stock: 0,
        stock_status: "out_of_stock",
        status: "inactive",
      });

      for (const c of combo) {
        await ProductVariationAttributeValue.create({
          variation_id: variation.id,
          attribute_id: c.attributeId,
          attribute_value_id: c.valueId,
        });
      }
      created += 1;
    }

    if (!product.has_variations && created > 0) {
      await product.update({ has_variations: true });
    }

    return res.json({ success: true, created, totalCombinations: combinations.length });
  } catch (error) {
    console.error("GENERATE VARIATIONS ERROR:", error);
    return res.status(500).json({ error: "Failed to generate variations" });
  }
};

exports.createVariation = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const body = req.body;
    const variation = await ProductVariation.create({
      product_id: product.id,
      sku: body.sku || null,
      barcode: body.barcode || null,
      regular_price: numOrDefault(body.regular_price, 0),
      sale_price: body.sale_price === "" || body.sale_price === undefined ? null : Number(body.sale_price),
      stock: numOrDefault(body.stock, 0),
      stock_status: body.stock_status || (numOrDefault(body.stock, 0) > 0 ? "in_stock" : "out_of_stock"),
      image_path: body.image ? toRelativeUploadPath(body.image) : null,
      status: body.status || "active",
    });

    const attributeValueIds = Array.isArray(body.attribute_value_ids) ? body.attribute_value_ids : [];
    for (const attrValueId of attributeValueIds) {
      const value = await ProductAttributeValue.findByPk(attrValueId);
      if (!value) continue;
      await ProductVariationAttributeValue.create({
        variation_id: variation.id,
        attribute_id: value.attribute_id,
        attribute_value_id: value.id,
      });
    }

    if (!product.has_variations) await product.update({ has_variations: true });

    return res.json({ success: true, variation });
  } catch (error) {
    console.error("CREATE VARIATION ERROR:", error);
    return res.status(500).json({ error: "Failed to create variation" });
  }
};

exports.updateVariation = async (req, res) => {
  try {
    const variation = await ProductVariation.findOne({
      where: { id: req.params.variationId, product_id: req.params.id },
    });
    if (!variation) return res.status(404).json({ error: "Variation not found" });

    const body = req.body;
    const fields = {};
    if (body.sku !== undefined) fields.sku = body.sku;
    if (body.barcode !== undefined) fields.barcode = body.barcode;
    if (body.regular_price !== undefined) fields.regular_price = numOrDefault(body.regular_price, 0);
    if (body.sale_price !== undefined) {
      fields.sale_price = body.sale_price === "" ? null : Number(body.sale_price);
    }
    if (body.stock !== undefined) fields.stock = numOrDefault(body.stock, 0);
    if (body.stock_status !== undefined) {
      fields.stock_status = body.stock_status;
    } else if (body.stock !== undefined) {
      // Keep stock_status in sync automatically when only `stock` is sent,
      // matching createVariation and the base product's update behavior.
      fields.stock_status = fields.stock > 0 ? "in_stock" : "out_of_stock";
    }
    if (body.status !== undefined) fields.status = body.status;
    if (body.image !== undefined) {
      if (variation.image_path && body.image !== variation.image_path) safeUnlink(variation.image_path);
      fields.image_path = body.image ? toRelativeUploadPath(body.image) : null;
    }

    await variation.update(fields);

    if (Array.isArray(body.attribute_value_ids)) {
      await ProductVariationAttributeValue.destroy({ where: { variation_id: variation.id } });
      for (const attrValueId of body.attribute_value_ids) {
        const value = await ProductAttributeValue.findByPk(attrValueId);
        if (!value) continue;
        await ProductVariationAttributeValue.create({
          variation_id: variation.id,
          attribute_id: value.attribute_id,
          attribute_value_id: value.id,
        });
      }
    }

    return res.json({ success: true, variation });
  } catch (error) {
    console.error("UPDATE VARIATION ERROR:", error);
    return res.status(500).json({ error: "Failed to update variation" });
  }
};

exports.deleteVariation = async (req, res) => {
  try {
    const variation = await ProductVariation.findOne({
      where: { id: req.params.variationId, product_id: req.params.id },
    });
    if (!variation) return res.status(404).json({ error: "Variation not found" });

    safeUnlink(variation.image_path);
    await variation.destroy();

    const remaining = await ProductVariation.count({ where: { product_id: req.params.id } });
    if (remaining === 0) {
      await Product.update({ has_variations: false }, { where: { id: req.params.id } });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE VARIATION ERROR:", error);
    return res.status(500).json({ error: "Failed to delete variation" });
  }
};
