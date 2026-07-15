// Shared helpers for the FShip shipping integration — payload shaping and
// pre-flight validation used by both the automatic order-flow shipment
// creation and the manual admin "Create Shipment" action.

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

// FShip requires weight (kg) and dimensions (cm) for every shipment. Product
// data may not carry physical dimensions, so sensible floor values are
// applied (1kg / 10cm by default, admin-configurable via Integration
// Settings → FShip) — FShip rejects zero values outright.
function computeShipmentDimensions(items = [], defaults = {}) {
  const { defaultWeight = 1, defaultLength = 10, defaultWidth = 10, defaultHeight = 10 } = defaults;
  const dimensions = items.reduce(
    (acc, item) => {
      const quantity = Math.max(1, normalizeNumber(item.quantity));
      acc.weight += normalizeNumber(item.weight) * quantity;
      acc.length = Math.max(acc.length, normalizeNumber(item.length) || 0);
      acc.width = Math.max(acc.width, normalizeNumber(item.width) || 0);
      acc.height = Math.max(acc.height, normalizeNumber(item.height) || 0);
      return acc;
    },
    { weight: 0, length: 0, width: 0, height: 0 }
  );

  const weight = Math.max(normalizeNumber(defaultWeight) || 1, dimensions.weight || normalizeNumber(defaultWeight) || 1);
  const length = Math.max(normalizeNumber(defaultLength) || 10, dimensions.length || normalizeNumber(defaultLength) || 10);
  const width = Math.max(normalizeNumber(defaultWidth) || 10, dimensions.width || normalizeNumber(defaultWidth) || 10);
  const height = Math.max(normalizeNumber(defaultHeight) || 10, dimensions.height || normalizeNumber(defaultHeight) || 10);
  const volumetricWeight = Math.max(1, Number(((length * width * height) / 5000).toFixed(2)));

  return { shipmentWeight: weight, shipmentLength: length, shipmentWidth: width, shipmentHeight: height, volumetricWeight };
}

function buildProductsPayload(items = []) {
  return items.map((item) => ({
    productId: String(item.productId || item.id || ""),
    productName: item.name || item.productName || "",
    unitPrice: normalizeNumber(item.price || item.unitPrice || item.regular_price || item.sale_price || 0),
    quantity: Math.max(1, normalizeNumber(item.quantity)),
    productCategory: item.category || item.productCategory || "",
    hsnCode: item.hsn || item.hsnCode || "",
    sku: item.sku || item.productSKU || "",
    taxRate: normalizeNumber(item.taxRate || item.tax_rate || 0),
    productDiscount: normalizeNumber(item.productDiscount || item.product_discount || 0),
  }));
}

// Validates everything FShip's createforwardorder marks as required, before
// any network call is made. Returns an array of human-readable problems —
// empty array means the shipment payload is safe to send.
function validateShipmentInput({ customerName, customerPhone, shippingAddress, items, paymentMethod, totalPrice, pickupAddressId }) {
  const errors = [];
  const address = shippingAddress || {};
  const addressLine = String(address.address || address.addressLine1 || address.address1 || "").trim();
  const pincode = String(address.postalCode || address.pincode || "").trim();
  const city = String(address.city || "").trim();
  const phone = String(customerPhone || address.phone || "").replace(/\D/g, "").slice(-10);

  if (!customerName || !String(customerName).trim()) errors.push("Customer name is missing");
  if (!/^\d{10}$/.test(phone)) errors.push("Customer mobile must be a valid 10-digit number");
  if (!addressLine) errors.push("Shipping address line is missing");
  if (!/^\d{6}$/.test(pincode)) errors.push("Shipping pincode must be a valid 6-digit pincode");
  if (!city) errors.push("Shipping city is missing");
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("Order has no products to ship");
  } else if (items.some((item) => !(item.name || item.productName))) {
    errors.push("One or more products are missing a name");
  }
  if (!["cod", "prepaid", "online", "razorpay", "upi", "card"].includes(String(paymentMethod || "").toLowerCase())) {
    errors.push(`Unsupported payment mode: ${paymentMethod}`);
  }
  if (normalizeNumber(totalPrice) <= 0) errors.push("Order total must be greater than zero");
  if (!pickupAddressId || Number(pickupAddressId) <= 0) {
    errors.push("FSHIP_PICKUP_ADDRESS_ID (warehouse) is not configured on the server");
  }

  return errors;
}

module.exports = {
  normalizeNumber,
  computeShipmentDimensions,
  buildProductsPayload,
  validateShipmentInput,
};
