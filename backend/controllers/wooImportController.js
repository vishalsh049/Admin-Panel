// TEMPORARY WooCommerce -> MySQL product migration. Not a live sync: this is
// meant to be run (possibly a few times, safely re-runnable) until the
// catalog is fully migrated, then the WOO_* env vars can be deleted. The
// website/admin panel always read from MySQL — WooCommerce is only ever a
// one-way import source here.
const {
  Category,
  Product,
  ProductImage,
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
  ProductVariationAttributeValue,
} = require("../models");
const woo = require("../services/wooCommerceService");
const { downloadImage } = require("../utils/wooImageDownloader");
const slugify = require("../utils/slugify");
const fs = require("fs");
const path = require("path");

async function deleteLocalImage(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  try {
    fs.unlinkSync(path.join(__dirname, "..", imagePath));
  } catch {}
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, "").trim();
}

// Sequelize's own err.message for validation/unique-constraint failures is
// just the generic string "Validation error" — the useful detail (which
// field, why) lives in err.errors[]. Surface that so the migration report
// actually says something diagnosable.
function describeSequelizeError(err) {
  if (Array.isArray(err.errors) && err.errors.length) {
    return err.errors.map((e) => `${e.path}: ${e.message} (got ${JSON.stringify(e.value)})`).join("; ");
  }
  return err.message;
}

function mapStockStatus(wooStatus) {
  return wooStatus === "instock" ? "in_stock" : "out_of_stock";
}

async function uniqueProductSlug(desiredSlug, productId, fallbackName) {
  const base = slugify(desiredSlug) || slugify(fallbackName) || `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await Product.findOne({ where: { slug: candidate } });
    if (!clash || clash.id === productId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

exports.testConnection = async (req, res) => {
  const result = await woo.testConnection();
  res.status(result.success ? 200 : 502).json(result);
};

exports.syncProducts = async (req, res) => {
  const report = {
    categoriesImported: 0,
    categoriesUpdated: 0,
    imagesImported: 0,
    variationsImported: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    errors: [],
  };
  // product_variations.sku is unique DB-wide, but some WooCommerce stores
  // use "variations" purely as an image picker (e.g. an "Image" attribute
  // with options 1-10) and leave every variation sharing the parent
  // product's SKU. Track SKUs already used *in this run* so a real
  // duplicate falls back to no SKU instead of throwing — the meaningful SKU
  // is already stored on the parent product either way.
  const seenVariationSkus = new Set();

  try {
    // ── 1. Categories ────────────────────────────────────────────────────
    const wooCategories = await woo.fetchAllCategories();
    const categoryIdMap = new Map(); // wooCategoryId -> local Category.id

    for (const wc of wooCategories) {
      try {
        let local = await Category.findOne({ where: { woo_category_id: wc.id } });
        if (!local && wc.slug) {
          local = await Category.findOne({ where: { slug: wc.slug } });
        }
        if (!local && wc.name) {
          // Slug formats can differ (WooCommerce auto-hyphenates; a category
          // created by hand in this admin panel may not) — name is what our
          // schema actually enforces as unique, so it's the more reliable
          // fallback match for a category that predates this import.
          local = await Category.findOne({ where: { name: wc.name } });
        }

        const payload = {
          name: wc.name,
          slug: wc.slug || slugify(wc.name),
          description: stripHtml(wc.description) || null,
          woo_category_id: wc.id,
        };

        if (local) {
          await local.update(payload);
          report.categoriesUpdated += 1;
        } else {
          local = await Category.create({ ...payload, status: "Active" });
          report.categoriesImported += 1;
        }

        if (wc.image?.src) {
          const localPath = await downloadImage(wc.image.src, "categories");
          if (localPath) await local.update({ image: localPath });
        }

        categoryIdMap.set(wc.id, local.id);
      } catch (err) {
        report.errors.push(`Category ${wc.id} (${wc.name}): ${describeSequelizeError(err)}`);
      }
    }

    // Resolve parent/child relationships now that every category has a local id
    for (const wc of wooCategories) {
      if (wc.parent && categoryIdMap.has(wc.id) && categoryIdMap.has(wc.parent)) {
        await Category.update(
          { parent_id: categoryIdMap.get(wc.parent) },
          { where: { id: categoryIdMap.get(wc.id) } }
        );
      }
    }

    // ── 2. Products ──────────────────────────────────────────────────────
    const wooProducts = await woo.fetchAllProducts();

    for (const wp of wooProducts) {
      try {
        let product = await Product.findOne({ where: { woo_product_id: wp.id } });
        if (!product && wp.sku) {
          product = await Product.findOne({ where: { sku: wp.sku } });
        }

        const primaryWooCategoryId = wp.categories?.[0]?.id;
        const category_id = primaryWooCategoryId ? categoryIdMap.get(primaryWooCategoryId) || null : null;
        const slug = await uniqueProductSlug(wp.slug, product?.id || null, wp.name);

        const payload = {
          name: wp.name,
          description: wp.description || "",
          short_description: stripHtml(wp.short_description) || "",
          regular_price: parseFloat(wp.regular_price || wp.price || 0) || 0,
          sale_price: wp.sale_price ? parseFloat(wp.sale_price) : null,
          sku: wp.sku || null,
          stock: wp.stock_quantity != null ? Number(wp.stock_quantity) : 0,
          stock_status: mapStockStatus(wp.stock_status),
          status: wp.status === "publish" ? "publish" : "draft",
          slug,
          category_id,
          category: wp.categories?.[0]?.name || null,
          is_featured: !!wp.featured,
          has_variations: wp.type === "variable",
          weight: wp.weight ? parseFloat(wp.weight) : null,
          length: wp.dimensions?.length ? parseFloat(wp.dimensions.length) : null,
          width: wp.dimensions?.width ? parseFloat(wp.dimensions.width) : null,
          height: wp.dimensions?.height ? parseFloat(wp.dimensions.height) : null,
          woo_product_id: wp.id,
          source: "admin",
        };

        if (product) {
          await product.update(payload);
          report.productsUpdated += 1;
        } else {
          product = await Product.create(payload);
          report.productsCreated += 1;
        }

        // Images — replace this product's gallery with the current WC set so
        // re-running the sync reflects WooCommerce's current state instead
        // of accumulating duplicates.
        if (Array.isArray(wp.images) && wp.images.length) {
          const oldImages = await ProductImage.findAll({ where: { product_id: product.id } });
          for (const old of oldImages) await deleteLocalImage(old.image_path);
          await ProductImage.destroy({ where: { product_id: product.id } });
          let sortOrder = 0;
          for (const img of wp.images) {
            const localPath = await downloadImage(img.src, "products");
            if (localPath) {
              await ProductImage.create({
                product_id: product.id,
                image_path: localPath,
                is_primary: sortOrder === 0,
                sort_order: sortOrder,
                alt_text: img.alt || wp.name,
              });
              report.imagesImported += 1;
              sortOrder += 1;
            }
          }
        }

        // Attributes (and their option values) — rebuilt fresh each sync;
        // needed to reconstruct the variation attribute matrix below.
        const attributeMap = new Map(); // wooAttrName -> { attributeId, valueIdByOption }
        if (Array.isArray(wp.attributes) && wp.attributes.length) {
          await ProductAttribute.destroy({ where: { product_id: product.id } });
          let attrSort = 0;
          for (const attr of wp.attributes) {
            const attribute = await ProductAttribute.create({
              product_id: product.id,
              name: attr.name,
              sort_order: attrSort,
              is_for_variations: !!attr.variation,
            });
            attrSort += 1;

            const valueIdByOption = new Map();
            const options = attr.options || [];
            for (let i = 0; i < options.length; i += 1) {
              const val = await ProductAttributeValue.create({
                attribute_id: attribute.id,
                value: options[i],
                sort_order: i,
              });
              valueIdByOption.set(options[i], val.id);
            }
            attributeMap.set(attr.name, { attributeId: attribute.id, valueIdByOption });
          }
        }

        // Variations
        if (wp.type === "variable" && Array.isArray(wp.variations) && wp.variations.length) {
          const wooVariations = await woo.fetchProductVariations(wp.id);
          const oldVariations = await ProductVariation.findAll({ where: { product_id: product.id } });
          for (const old of oldVariations) await deleteLocalImage(old.image_path);
          await ProductVariation.destroy({ where: { product_id: product.id } });

          for (const wv of wooVariations) {
            const imagePath = wv.image?.src ? await downloadImage(wv.image.src, "products") : null;

            let variationSku = wv.sku ? String(wv.sku).trim() : "";
            if (!variationSku || seenVariationSkus.has(variationSku)) {
              variationSku = null;
            } else {
              seenVariationSkus.add(variationSku);
            }

            const variation = await ProductVariation.create({
              product_id: product.id,
              sku: variationSku,
              regular_price: parseFloat(wv.regular_price || wv.price || 0) || 0,
              sale_price: wv.sale_price ? parseFloat(wv.sale_price) : null,
              stock: wv.stock_quantity != null ? Number(wv.stock_quantity) : 0,
              stock_status: mapStockStatus(wv.stock_status),
              image_path: imagePath,
              status: "active",
              woo_variation_id: wv.id,
            });
            report.variationsImported += 1;

            for (const wvAttr of wv.attributes || []) {
              const entry = attributeMap.get(wvAttr.name);
              const valueId = entry?.valueIdByOption.get(wvAttr.option);
              if (entry && valueId) {
                await ProductVariationAttributeValue.create({
                  variation_id: variation.id,
                  attribute_id: entry.attributeId,
                  attribute_value_id: valueId,
                });
              }
            }
          }
        }
      } catch (err) {
        report.productsSkipped += 1;
        report.errors.push(`Product ${wp.id} (${wp.name || "unnamed"}): ${describeSequelizeError(err)}`);
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    res.status(502).json({
      success: false,
      message: woo.describeError(err),
      report,
    });
  }
};
