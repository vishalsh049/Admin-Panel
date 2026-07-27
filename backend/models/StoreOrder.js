const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreOrder = sequelize.define(
  "StoreOrder",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    customerName: { type: DataTypes.STRING, allowNull: false },
    customerEmail: { type: DataTypes.STRING, allowNull: false },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    items: { type: DataTypes.JSON, allowNull: false },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: { type: DataTypes.STRING, defaultValue: "cod" },
    status: {
      type: DataTypes.ENUM("pending", "processing", "shipped", "delivered", "cancelled"),
      defaultValue: "pending",
    },
    isPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    razorpayOrderId: { type: DataTypes.STRING, allowNull: true },
    razorpayPaymentId: { type: DataTypes.STRING, allowNull: true },
    razorpaySignature: { type: DataTypes.STRING, allowNull: true },
    // created | paid | failed | refund_initiated | refunded | not_applicable (COD)
    paymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "not_applicable" },
    paymentDetails: { type: DataTypes.JSON, allowNull: true },
    refundId: { type: DataTypes.STRING, allowNull: true },
    refundAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    trackingNumber: { type: DataTypes.STRING, allowNull: true },
    courierName: { type: DataTypes.STRING, allowNull: true },
    fshipOrderId: { type: DataTypes.STRING, allowNull: true },
    fshipPickupId: { type: DataTypes.INTEGER, allowNull: true },
    fshipResponse: { type: DataTypes.JSON, allowNull: true },
    routeCode: { type: DataTypes.STRING, allowNull: true },
    // not_created | pending (creation failed, retry allowed) | created |
    // pickup_registered | cancelled
    shippingStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "not_created" },
    trackingStatus: { type: DataTypes.STRING, allowNull: true },
    trackingLocation: { type: DataTypes.STRING, allowNull: true },
    trackingRemark: { type: DataTypes.TEXT, allowNull: true },
    lastScanAt: { type: DataTypes.DATE, allowNull: true },
    labelUrl: { type: DataTypes.TEXT, allowNull: true },
    manifestUrl: { type: DataTypes.TEXT, allowNull: true },
    invoiceUrl: { type: DataTypes.TEXT, allowNull: true },
    billingAddress: { type: DataTypes.JSON, allowNull: true },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    couponCode: { type: DataTypes.STRING, allowNull: true },
    gstAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    shippingCharges: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    expectedDeliveryDate: { type: DataTypes.DATE, allowNull: true },
    invoiceNumber: { type: DataTypes.STRING, allowNull: true },
    assignedTo: { type: DataTypes.INTEGER, allowNull: true },
    assignedToName: { type: DataTypes.STRING, allowNull: true },
    isHold: { type: DataTypes.BOOLEAN, defaultValue: false },
    holdReason: { type: DataTypes.STRING, allowNull: true },
    woo_order_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "store_orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = StoreOrder;
