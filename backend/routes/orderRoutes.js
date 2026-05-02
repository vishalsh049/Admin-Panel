const express = require("express");
const router = express.Router();
const WooCommerce = require("../config/woocommerce");

router.get("/:id", async (req, res) => {

try {

if (!WooCommerce) {
  return res.status(400).json({
    success: false,
    message: "WooCommerce not configured",
  });
}

const response = await WooCommerce.get(`orders/${req.params.id}`);

const order = response.data;

res.json({
success: true,
data: {

date: order.date_created,
status: order.status,
paymentMethod: order.payment_method_title,
shippingCharge: order.shipping_total,
discount: order.discount_total,

billing: {
firstName: order.billing.first_name,
lastName: order.billing.last_name,
phone: order.billing.phone,
email: order.billing.email,
address: order.billing.address_1 + " " + (order.billing.address_2 || ""),
city: order.billing.city,
state: order.billing.state,
country: order.billing.country,
pincode: order.billing.postcode
},

shipping: {
firstName: order.shipping.first_name,
lastName: order.shipping.last_name,
phone: order.billing.phone,
email: order.billing.email,
address: order.shipping.address_1 + " " + (order.shipping.address_2 || ""),
city: order.shipping.city,
state: order.shipping.state,
country: order.shipping.country,
pincode: order.shipping.postcode
},

items: order.line_items.map(item => ({
name: item.name,
sku: item.sku || "",
qty: item.quantity,
price: parseFloat(item.price),
line_subtotal: parseFloat(item.subtotal),
line_total: parseFloat(item.total),
gst: item.total_tax ? 18 : 0
}))
}
});

} catch (error) {

console.log(error.response?.data || error.message);

res.status(500).json({
success:false,
message:"WooCommerce authentication failed"
});

}

});

module.exports = router;
