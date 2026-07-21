// Staff assignment + a hold flag layered on top of the existing status enum.
// Hold is deliberately a boolean (not a new ENUM value) so it never touches
// the many `status === "..."` checks across storeRoutes.js, paymentRoutes.js,
// shippingController.js and the customer-facing TrackOrder module. Follows
// the addIfMissing/describeTable idempotency pattern from
// 0013_add_shipping_tracking_fields.js — no FK constraint on assigned_to,
// matching how order_id in the other store_order_* tables intentionally
// avoids hard FKs into this heavily-written table.
module.exports = {
  async up(queryInterface, { DataTypes, sequelize }) {
    const table = await queryInterface.describeTable("store_orders");

    const addIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("store_orders", name, definition);
      }
    };

    await addIfMissing("assignedTo", { type: DataTypes.INTEGER, allowNull: true });
    await addIfMissing("assignedToName", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("isHold", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await addIfMissing("holdReason", { type: DataTypes.STRING, allowNull: true });

    const [indexes] = await sequelize.query(
      "SHOW INDEX FROM store_orders WHERE Key_name = 'idx_store_orders_assigned_to'"
    );
    if (indexes.length === 0) {
      await queryInterface.addIndex("store_orders", ["assignedTo"], {
        name: "idx_store_orders_assigned_to",
      });
    }
  },
};
