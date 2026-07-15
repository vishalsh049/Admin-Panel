module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("store_orders");

    if (!table.razorpayOrderId) {
      await queryInterface.addColumn("store_orders", "razorpayOrderId", {
        type: DataTypes.STRING,
        allowNull: true,
        field: "razorpayOrderId",
      });
    }

    if (!table.razorpayPaymentId) {
      await queryInterface.addColumn("store_orders", "razorpayPaymentId", {
        type: DataTypes.STRING,
        allowNull: true,
        field: "razorpayPaymentId",
      });
    }

    if (!table.razorpaySignature) {
      await queryInterface.addColumn("store_orders", "razorpaySignature", {
        type: DataTypes.STRING,
        allowNull: true,
        field: "razorpaySignature",
      });
    }

    // created (rzp order issued) | paid | failed | refund_initiated |
    // refunded | not_applicable (COD)
    if (!table.paymentStatus) {
      await queryInterface.addColumn("store_orders", "paymentStatus", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "not_applicable",
        field: "paymentStatus",
      });
    }

    // Raw gateway entities (payment / failure / refund / webhook payloads)
    // kept as an audit trail for support and reconciliation.
    if (!table.paymentDetails) {
      await queryInterface.addColumn("store_orders", "paymentDetails", {
        type: DataTypes.JSON,
        allowNull: true,
        field: "paymentDetails",
      });
    }

    if (!table.refundId) {
      await queryInterface.addColumn("store_orders", "refundId", {
        type: DataTypes.STRING,
        allowNull: true,
        field: "refundId",
      });
    }

    if (!table.refundAmount) {
      await queryInterface.addColumn("store_orders", "refundAmount", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "refundAmount",
      });
    }

    // Webhooks and the verify endpoint both look orders up by the gateway
    // order id, so it needs an index on a live table.
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM store_orders WHERE Key_name = 'idx_store_orders_razorpay_order_id'"
    );
    if (indexes.length === 0) {
      await queryInterface.addIndex("store_orders", ["razorpayOrderId"], {
        name: "idx_store_orders_razorpay_order_id",
      });
    }
  },
};
