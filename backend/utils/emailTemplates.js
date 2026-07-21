// Plain-HTML email bodies for order lifecycle notifications — no templating
// engine, consistent with how sendMail() is already used elsewhere (password
// reset, contact form).
function orderConfirmationEmail(order) {
  return `
    <p>Hi ${order.customerName},</p>
    <p>Thank you for your order! We've received Order <strong>#${order.id}</strong> for
    <strong>Rs. ${Number(order.totalPrice).toFixed(2)}</strong>.</p>
    <p>Payment method: ${order.paymentMethod === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery"}</p>
    <p>We'll notify you again once your order ships.</p>
    <p>Thank you for shopping with us.</p>
  `;
}

function orderStatusChangeEmail(order, newStatus) {
  const STATUS_TEXT = {
    processing: "is now being processed",
    shipped: "has been shipped",
    delivered: "has been delivered",
    cancelled: "has been cancelled",
    pending: "has been placed and is pending processing",
  };
  return `
    <p>Hi ${order.customerName},</p>
    <p>Your order <strong>#${order.id}</strong> ${STATUS_TEXT[newStatus] || `is now "${newStatus}"`}.</p>
    ${order.trackingNumber ? `<p>Tracking number: <strong>${order.trackingNumber}</strong>${order.courierName ? ` (${order.courierName})` : ""}</p>` : ""}
    <p>Thank you for shopping with us.</p>
  `;
}

module.exports = { orderConfirmationEmail, orderStatusChangeEmail };
