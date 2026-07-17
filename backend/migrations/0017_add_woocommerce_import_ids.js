// Adds WooCommerce origin-ID columns used only to make the one-time/temporary
// WooCommerce product migration idempotent: re-running the sync updates the
// same local rows instead of creating duplicates, matched by these IDs (or
// by SKU as a fallback — see controllers/wooImportController.js).
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const productsTable = await queryInterface.describeTable("products");
    if (!productsTable.woo_product_id) {
      await queryInterface.addColumn("products", "woo_product_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    const productIndexes = await queryInterface.showIndex("products");
    if (!productIndexes.some((i) => i.name === "products_woo_product_id_unique")) {
      await queryInterface.addIndex("products", ["woo_product_id"], {
        name: "products_woo_product_id_unique",
        unique: true,
      });
    }

    const categoriesTable = await queryInterface.describeTable("product_categories");
    if (!categoriesTable.woo_category_id) {
      await queryInterface.addColumn("product_categories", "woo_category_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    const categoryIndexes = await queryInterface.showIndex("product_categories");
    if (!categoryIndexes.some((i) => i.name === "product_categories_woo_category_id_unique")) {
      await queryInterface.addIndex("product_categories", ["woo_category_id"], {
        name: "product_categories_woo_category_id_unique",
        unique: true,
      });
    }

    const variationsTable = await queryInterface.describeTable("product_variations");
    if (!variationsTable.woo_variation_id) {
      await queryInterface.addColumn("product_variations", "woo_variation_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    const variationIndexes = await queryInterface.showIndex("product_variations");
    if (!variationIndexes.some((i) => i.name === "product_variations_woo_variation_id_unique")) {
      await queryInterface.addIndex("product_variations", ["woo_variation_id"], {
        name: "product_variations_woo_variation_id_unique",
        unique: true,
      });
    }
  },
};
