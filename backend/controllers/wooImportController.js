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
const StoreCustomer = require("../models/StoreCustomer");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");
const sequelize = require("../config/db");
const woo = require("../services/wooCommerceService");
const { downloadImage } = require("../utils/wooImageDownloader");
const slugify = require("../utils/slugify");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { writeSyncLog } = require("../utils/integrationSyncLog");

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
        // of accumulating duplicates. Downloads happen BEFORE the old gallery
        // is touched: if every download fails (e.g. a transient network
        // blip), the existing images are left alone instead of the product
        // ending up with zero images.
        if (Array.isArray(wp.images) && wp.images.length) {
          const downloaded = [];
          let failedCount = 0;
          for (const img of wp.images) {
            const localPath = await downloadImage(img.src, "products");
            if (localPath) {
              downloaded.push({ localPath, alt: img.alt || wp.name });
            } else {
              failedCount += 1;
            }
          }

          if (downloaded.length) {
            const oldImages = await ProductImage.findAll({ where: { product_id: product.id } });
            for (const old of oldImages) await deleteLocalImage(old.image_path);
            await ProductImage.destroy({ where: { product_id: product.id } });
            for (let i = 0; i < downloaded.length; i += 1) {
              await ProductImage.create({
                product_id: product.id,
                image_path: downloaded[i].localPath,
                is_primary: i === 0,
                sort_order: i,
                alt_text: downloaded[i].alt,
              });
              report.imagesImported += 1;
            }
            if (failedCount) {
              report.errors.push(
                `Product ${wp.id} (${wp.name}): ${failedCount} of ${wp.images.length} image(s) failed to download — kept the ${downloaded.length} that succeeded.`
              );
            }
          } else {
            report.errors.push(
              `Product ${wp.id} (${wp.name}): all ${wp.images.length} image download(s) failed — existing gallery left unchanged.`
            );
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

    await writeSyncLog(req, "woocommerce", "product_sync", report);
    res.json({ success: true, report });
  } catch (err) {
    await writeSyncLog(req, "woocommerce", "product_sync_failed", { ...report, fatalError: woo.describeError(err) });
    res.status(502).json({
      success: false,
      message: woo.describeError(err),
      report,
    });
  }
};

exports.syncCustomers = async (req, res) => {
  const report = { customersCreated: 0, customersUpdated: 0, customersSkippedSpam: 0, customersSkipped: 0, errors: [] };
  try {
    const wooCustomers = await woo.fetchAllCustomers();

    for (const wc of wooCustomers) {
      // WooCommerce stores set is_paying_customer=true only after a real
      // paid order — mass bot-registered accounts (a common WooCommerce
      // problem: garbage "1000 USD bonus" spam signups via the storefront
      // signup form) never place an order, so this is the reliable signal
      // to exclude them without touching real customer data.
      if (!wc.is_paying_customer) {
        report.customersSkippedSpam += 1;
        continue;
      }
      try {
        const email = (wc.email || "").trim().toLowerCase() || null;
        let local = await StoreCustomer.findOne({ where: { woo_customer_id: wc.id } });
        if (!local && email) {
          local = await StoreCustomer.findOne({ where: { email } });
        }

        const name =
          [wc.first_name, wc.last_name].filter(Boolean).join(" ").trim() ||
          wc.username ||
          email ||
          `Customer ${wc.id}`;

        const payload = {
          name,
          email,
          phone: wc.billing?.phone || null,
          woo_customer_id: wc.id,
        };

        if (local) {
          await local.update(payload);
          report.customersUpdated += 1;
        } else {
          // Imported accounts get an unusable random password — same
          // precedent as social-login signups in routes/storeRoutes.js
          // (loginOrCreateCustomerFromSocialProfile). They use the existing
          // "forgot password" flow to set a real one.
          await StoreCustomer.create({ ...payload, password: crypto.randomBytes(32).toString("hex") });
          report.customersCreated += 1;
        }
      } catch (err) {
        report.customersSkipped += 1;
        report.errors.push(`Customer ${wc.id} (${wc.email || "no email"}): ${describeSequelizeError(err)}`);
      }
    }

    await writeSyncLog(req, "woocommerce", "customer_sync", report);
    res.json({ success: true, report });
  } catch (err) {
    await writeSyncLog(req, "woocommerce", "customer_sync_failed", { ...report, fatalError: woo.describeError(err) });
    res.status(502).json({ success: false, message: woo.describeError(err), report });
  }
};

function mapOrderStatus(wooStatus) {
  switch (wooStatus) {
    case "completed":
      return "delivered";
    case "processing":
      return "processing";
    case "cancelled":
    case "failed":
    case "refunded":
      return "cancelled";
    case "on-hold":
    case "pending":
    default:
      return "pending";
  }
}

// Maps a WooCommerce billing/shipping address block onto the shape this app
// already stores in StoreOrder.shippingAddress/billingAddress (matches
// models/StoreAddress.js's fields) — returns null for an empty block so the
// caller can fall back (e.g. shipping -> billing) instead of storing blanks.
function mapWooAddress(wooAddr) {
  if (!wooAddr) return null;
  const fullName = [wooAddr.first_name, wooAddr.last_name].filter(Boolean).join(" ").trim();
  const addressLine = [wooAddr.address_1, wooAddr.address_2].filter(Boolean).join(", ").trim();
  if (!fullName && !addressLine && !wooAddr.city && !wooAddr.postcode) return null;
  return {
    fullName: fullName || null,
    phone: wooAddr.phone || null,
    addressLine: addressLine || null,
    city: wooAddr.city || null,
    state: wooAddr.state || null,
    postalCode: wooAddr.postcode || null,
    country: wooAddr.country || "India",
  };
}

async function resolveProductImage(productId, imageCache) {
  if (imageCache.has(productId)) return imageCache.get(productId);
  const img = await ProductImage.findOne({ where: { product_id: productId, is_primary: true } });
  const imagePath = img ? img.image_path : null;
  imageCache.set(productId, imagePath);
  return imagePath;
}

// StoreOrder.items must carry the LOCAL product id (frontend/src/pages/
// Checkout.jsx reads item.id/name/price/quantity/image), not WooCommerce's —
// resolved via the woo_product_id/woo_variation_id columns the product
// import already populated. A line whose product was never migrated (or was
// deleted) is kept in the order with id: null and reported, rather than
// dropping the line and silently understating the order total.
async function mapOrderItems(wooLineItems, imageCache) {
  const items = [];
  const unresolved = [];
  for (const li of wooLineItems || []) {
    let localProductId = null;
    if (li.variation_id) {
      const variation = await ProductVariation.findOne({ where: { woo_variation_id: li.variation_id } });
      if (variation) localProductId = variation.product_id;
    }
    if (!localProductId && li.product_id) {
      const product = await Product.findOne({ where: { woo_product_id: li.product_id } });
      if (product) localProductId = product.id;
    }
    if (!localProductId) unresolved.push(li.name || `product ${li.product_id}`);

    const image = localProductId ? await resolveProductImage(localProductId, imageCache) : null;
    const price =
      li.price != null
        ? parseFloat(li.price)
        : li.total && li.quantity
        ? parseFloat(li.total) / li.quantity
        : 0;

    items.push({
      id: localProductId,
      name: li.name,
      price: Number.isFinite(price) ? price : 0,
      quantity: li.quantity || 1,
      image,
    });
  }
  return { items, unresolved };
}

exports.syncOrders = async (req, res) => {
  const report = { ordersCreated: 0, ordersUpdated: 0, ordersSkipped: 0, unresolvedItems: 0, errors: [] };
  const imageCache = new Map();

  try {
    const wooOrders = await woo.fetchAllOrders();

    for (const wo of wooOrders) {
      try {
        let order = await StoreOrder.findOne({ where: { woo_order_id: wo.id } });

        let customerId = null;
        if (wo.customer_id) {
          const customer = await StoreCustomer.findOne({ where: { woo_customer_id: wo.customer_id } });
          if (customer) customerId = customer.id;
        }

        const { items, unresolved } = await mapOrderItems(wo.line_items, imageCache);
        if (unresolved.length) {
          report.unresolvedItems += unresolved.length;
          report.errors.push(`Order ${wo.id}: no local product match for: ${unresolved.join(", ")}`);
        }

        const shippingAddress =
          mapWooAddress(wo.shipping) ||
          mapWooAddress(wo.billing) || {
            fullName: null,
            phone: null,
            addressLine: null,
            city: null,
            state: null,
            postalCode: null,
            country: "India",
          };
        if (!shippingAddress.phone) shippingAddress.phone = wo.billing?.phone || null;
        const billingAddress = mapWooAddress(wo.billing);

        const customerName = [wo.billing?.first_name, wo.billing?.last_name].filter(Boolean).join(" ").trim() || "Guest";
        let customerEmail = (wo.billing?.email || "").trim().toLowerCase() || null;
        if (!customerEmail) {
          customerEmail = `order-${wo.id}@no-email.invalid`;
          report.errors.push(`Order ${wo.id}: WooCommerce order had no billing email, used a placeholder.`);
        }

        const status = mapOrderStatus(wo.status);
        const payload = {
          customerId,
          customerName,
          customerEmail,
          customerPhone: wo.billing?.phone || null,
          items,
          shippingAddress,
          billingAddress,
          totalPrice: parseFloat(wo.total || 0) || 0,
          paymentMethod: wo.payment_method_title || wo.payment_method || "unknown",
          status,
          isPaid: !!wo.date_paid,
          paidAt: wo.date_paid ? new Date(wo.date_paid) : null,
          paymentStatus: wo.date_paid ? "paid" : "not_applicable",
          discountAmount: parseFloat(wo.discount_total || 0) || 0,
          couponCode: (wo.coupon_lines || [])[0]?.code || null,
          shippingCharges: parseFloat(wo.shipping_total || 0) || 0,
          woo_order_id: wo.id,
        };
        if (order) {
          await order.update(payload);
          report.ordersUpdated += 1;
        } else {
          order = await StoreOrder.create(payload);
          report.ordersCreated += 1;
        }

        // Preserve the WooCommerce order's original creation date instead of
        // "now". Verified empirically: Sequelize's ORM refuses to write the
        // createdAt-designated attribute via .create()/.update() no matter
        // how it's passed (wrong key, right key, silent:true, explicit
        // `fields` option — none worked), so a raw query is the only way.
        const originalCreatedAt = wo.date_created ? new Date(wo.date_created) : new Date();
        await sequelize.query("UPDATE store_orders SET created_at = ? WHERE id = ?", {
          replacements: [originalCreatedAt, order.id],
        });

        // The exact original WooCommerce status is preserved verbatim here
        // even though it had to be mapped onto this app's 5-value ENUM above
        // — exact-string match means re-running the sync only adds a new
        // history row when the WooCommerce status actually changed.
        const historyDescription = `Imported from WooCommerce (original status: ${wo.status})`;
        const existingHistory = await StoreOrderStatusHistory.findOne({
          where: { order_id: order.id, description: historyDescription },
        });
        if (!existingHistory) {
          await StoreOrderStatusHistory.create({ order_id: order.id, status, description: historyDescription });
        }
      } catch (err) {
        report.ordersSkipped += 1;
        report.errors.push(`Order ${wo.id}: ${describeSequelizeError(err)}`);
      }
    }

    await writeSyncLog(req, "woocommerce", "order_sync", report);
    res.json({ success: true, report });
  } catch (err) {
    await writeSyncLog(req, "woocommerce", "order_sync_failed", { ...report, fatalError: woo.describeError(err) });
    res.status(502).json({ success: false, message: woo.describeError(err), report });
  }
};
