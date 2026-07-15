// Server-side order amount computation for online payments.
// The COD flow historically trusts the client's totalPrice; for money that
// actually moves through the gateway the amount is recomputed here from the
// live product/variation prices so a tampered cart can never underpay.
const Product = require("../models/Products");
const { ProductVariation } = require("../models");

// Mirrors utils/serializers/productSerializer.js effectivePrice()
function effectivePrice(regularPrice, salePrice) {
  const regular = Number(regularPrice) || 0;
  const sale = Number(salePrice) || 0;
  return sale > 0 && sale < regular ? sale : regular;
}

const FREE_SHIPPING_THRESHOLD = 299;
const FLAT_SHIPPING_CHARGE = 49;

// Returns { items, subtotal, shippingCharges, total } with every price
// replaced by the database price, or throws an Error with .status = 400
// describing the first problem found.
async function priceOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error("Order must contain at least one item");
    err.status = 400;
    throw err;
  }

  const items = [];
  let subtotal = 0;

  for (const raw of rawItems) {
    const productId = Number(raw.id || raw.productId);
    const quantity = Math.floor(Number(raw.quantity) || 0);
    if (!productId || quantity < 1) {
      const err = new Error("Each item needs a valid product id and quantity");
      err.status = 400;
      throw err;
    }
    if (quantity > 100) {
      const err = new Error("Quantity per item cannot exceed 100");
      err.status = 400;
      throw err;
    }

    const product = await Product.findByPk(productId);
    if (!product || product.status !== "publish") {
      const err = new Error(`"${raw.name || `Product #${productId}`}" is no longer available`);
      err.status = 400;
      throw err;
    }

    let unitPrice;
    if (raw.variationId) {
      const variation = await ProductVariation.findByPk(Number(raw.variationId));
      if (!variation || variation.product_id !== product.id || variation.status !== "active") {
        const err = new Error(`Selected option for "${product.name}" is no longer available`);
        err.status = 400;
        throw err;
      }
      unitPrice = effectivePrice(variation.regular_price, variation.sale_price);
    } else {
      unitPrice = effectivePrice(product.regular_price, product.sale_price);
    }

    if (!(unitPrice > 0)) {
      const err = new Error(`"${product.name}" cannot be purchased right now`);
      err.status = 400;
      throw err;
    }

    subtotal += unitPrice * quantity;
    items.push({
      ...raw,
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const shippingCharges = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_CHARGE;
  const total = Math.round((subtotal + shippingCharges) * 100) / 100;

  return { items, subtotal, shippingCharges, total };
}

module.exports = { priceOrderItems, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_CHARGE };
