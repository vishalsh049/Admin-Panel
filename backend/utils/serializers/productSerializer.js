const toRelativeUploadPath = require("../toRelativeUploadPath");
const { PLACEHOLDER_IMAGE_PATH } = require("../constants");

function normalizeStatus(status = "publish") {
  const value = String(status).trim().toLowerCase();
  return value === "draft" ? "draft" : "publish";
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function effectivePrice(regularPrice, salePrice) {
  const regular = toNumber(regularPrice, 0);
  const sale = toNumber(salePrice, null);
  return sale && sale > 0 && sale < regular ? sale : regular;
}

function serializeImages(images = []) {
  return [...images]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((img) => ({
      id: img.id,
      path: toRelativeUploadPath(img.image_path),
      is_primary: !!img.is_primary,
      sort_order: img.sort_order || 0,
      alt_text: img.alt_text || "",
    }));
}

function resolvePrimaryImage(images = [], legacyImage) {
  const sorted = serializeImages(images);
  const primary = sorted.find((img) => img.is_primary) || sorted[0];
  if (primary) return primary.path;
  if (legacyImage) return toRelativeUploadPath(legacyImage);
  return PLACEHOLDER_IMAGE_PATH;
}

function serializeAttributes(attributes = []) {
  return [...attributes]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((attr) => ({
      id: attr.id,
      name: attr.name,
      is_for_variations: !!attr.is_for_variations,
      values: [...(attr.values || [])]
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((v) => ({ id: v.id, value: v.value })),
    }));
}

function serializeVariation(variation, { context }) {
  const data = variation.toJSON ? variation.toJSON() : variation;
  return {
    id: data.id,
    sku: data.sku || "",
    barcode: context === "admin" ? data.barcode || "" : undefined,
    regular_price: toNumber(data.regular_price, 0),
    sale_price: data.sale_price ? toNumber(data.sale_price) : null,
    price: effectivePrice(data.regular_price, data.sale_price),
    stock: context === "admin" ? toNumber(data.stock, 0) : undefined,
    stock_status: data.stock_status || "in_stock",
    in_stock: (data.stock_status || "in_stock") === "in_stock" && toNumber(data.stock, 0) > 0,
    image: data.image_path ? toRelativeUploadPath(data.image_path) : null,
    status: data.status || "active",
    attribute_value_ids: (data.attributeValues || []).map((v) => v.id),
  };
}

function computePriceRange(variations = []) {
  const active = variations.filter((v) => (v.status || "active") === "active");
  if (active.length === 0) return null;
  const prices = active.map((v) => effectivePrice(v.regular_price, v.sale_price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function computeVariableInStock(variations = []) {
  return variations.some(
    (v) => (v.status || "active") === "active" && (v.stock_status || "in_stock") === "in_stock" && toNumber(v.stock, 0) > 0
  );
}

/**
 * Single source of truth for shaping a Product (+ associations) into an API
 * response, used by both the admin routes and the public store routes so
 * they never drift out of sync with each other again.
 */
function buildProductPayload(productInstance, { context = "admin" } = {}) {
  const data = productInstance.toJSON ? productInstance.toJSON() : productInstance;
  const images = data.images || [];
  const variations = data.variations || [];
  const hasVariations = !!data.has_variations && variations.length > 0;

  const categoryName = data.categoryRef?.name || data.category || "";
  const categoryId = data.categoryRef?.id || data.category_id || null;

  const base = {
    id: data.id,
    name: data.name || "",
    slug: data.slug || "",
    description: data.description || "",
    short_description: data.short_description || "",
    sku: data.sku || "",
    category: categoryName,
    category_id: categoryId,
    brand: data.brand || "",
    regular_price: toNumber(data.regular_price, 0),
    sale_price: data.sale_price ? toNumber(data.sale_price) : null,
    low_stock_threshold: toNumber(data.low_stock_threshold, 5),
    is_low_stock: !hasVariations && toNumber(data.stock, 0) > 0 && toNumber(data.stock, 0) <= toNumber(data.low_stock_threshold, 5),
    price: hasVariations
      ? computePriceRange(variations)?.min ?? effectivePrice(data.regular_price, data.sale_price)
      : effectivePrice(data.regular_price, data.sale_price),
    mrp: toNumber(data.regular_price, 0),
    stock: toNumber(data.stock, 0),
    stock_status: data.stock_status || "in_stock",
    in_stock: hasVariations
      ? computeVariableInStock(variations)
      : (data.stock_status || "in_stock") === "in_stock" && toNumber(data.stock, 0) > 0,
    status: normalizeStatus(data.status),
    has_variations: hasVariations,
    price_range: hasVariations ? computePriceRange(variations) : null,
    image: resolvePrimaryImage(images, data.image),
    images: serializeImages(images),
    color: data.color || "",
    size: data.size || "",
    is_featured: !!data.is_featured,
    is_best_seller: !!data.is_best_seller,
    is_new_arrival: !!data.is_new_arrival,
    is_trending: !!data.is_trending,
    rating: 0,
    numReviews: 0,
    // SEO triplet is public so the storefront PDP can set meta tags.
    seo_title: data.seo_title || "",
    seo_description: data.seo_description || "",
    seo_keywords: data.seo_keywords || "",
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  if (hasVariations) {
    base.attributes = serializeAttributes(data.attributes);
    base.variations = variations
      .filter((v) => context === "admin" || (v.status || "active") === "active")
      .map((v) => serializeVariation(v, { context }));
  }

  if (context === "admin") {
    return {
      ...base,
      source: data.source || "admin",
      cost_price: data.cost_price ? toNumber(data.cost_price) : null,
      barcode: data.barcode || "",
      gst_percent: toNumber(data.gst_percent, 0),
      hsn: data.hsn || "",
      tax_class: data.tax_class || "",
      tax_status: data.tax_status || "",
      weight: toNumber(data.weight, 0),
      length: toNumber(data.length, 0),
      width: toNumber(data.width, 0),
      height: toNumber(data.height, 0),
    };
  }

  return base;
}

module.exports = { buildProductPayload };
