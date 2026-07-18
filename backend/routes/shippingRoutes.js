const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const shipping = require("../controllers/shippingController");

// All shipping operations are admin-only: FShip credentials never reach the
// browser, and every call below goes out signed from the backend.
router.use(adminAuth, requirePermission("orders"));

// Courier master data
router.get("/couriers", shipping.listCouriers);

// Rate + serviceability lookups
router.post("/rate-calculator", shipping.rateCalculatorHandler);
router.post("/serviceability", shipping.serviceabilityHandler);

// Per-order shipment lifecycle
router.get("/orders/:orderId", shipping.getShippingInfo);
router.post("/orders/:orderId/create", shipping.createShipment);
router.post("/orders/:orderId/pickup", shipping.registerPickupHandler);
router.post("/orders/:orderId/label", shipping.generateLabel);
router.post("/orders/:orderId/refresh-tracking", shipping.refreshTracking);
router.get("/orders/:orderId/tracking", shipping.trackingHistoryHandler);
router.post("/orders/:orderId/cancel", shipping.cancelShipment);

module.exports = router;
