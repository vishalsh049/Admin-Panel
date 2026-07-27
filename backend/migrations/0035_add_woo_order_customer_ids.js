// Adds WooCommerce origin-ID columns used only to make the one-time/temporary
// WooCommerce orders + customers migration idempotent: re-running the sync
// updates the same local rows instead of creating duplicates, matched by
// these IDs (or by email as a fallback for customers — see
// controllers/wooImportController.js). Same pattern as
// 0017_add_woocommerce_import_ids.js for products/categories/variations.
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const customersTable = await queryInterface.describeTable("store_customers");
    if (!customersTable.woo_customer_id) {
      await queryInterface.addColumn("store_customers", "woo_customer_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    const customerIndexes = await queryInterface.showIndex("store_customers");
    if (!customerIndexes.some((i) => i.name === "store_customers_woo_customer_id_unique")) {
      await queryInterface.addIndex("store_customers", ["woo_customer_id"], {
        name: "store_customers_woo_customer_id_unique",
        unique: true,
      });
    }

    const ordersTable = await queryInterface.describeTable("store_orders");
    if (!ordersTable.woo_order_id) {
      await queryInterface.addColumn("store_orders", "woo_order_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    const orderIndexes = await queryInterface.showIndex("store_orders");
    if (!orderIndexes.some((i) => i.name === "store_orders_woo_order_id_unique")) {
      await queryInterface.addIndex("store_orders", ["woo_order_id"], {
        name: "store_orders_woo_order_id_unique",
        unique: true,
      });
    }
  },
};
