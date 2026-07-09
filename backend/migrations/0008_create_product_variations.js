module.exports = {
  async up(queryInterface, { DataTypes }) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("product_variations")) {
      await queryInterface.createTable("product_variations", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
        },
        sku: { type: DataTypes.STRING, allowNull: true, unique: true },
        barcode: { type: DataTypes.STRING, allowNull: true },
        regular_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        sale_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        stock_status: {
          type: DataTypes.ENUM("in_stock", "out_of_stock"),
          allowNull: false,
          defaultValue: "in_stock",
        },
        image_path: { type: DataTypes.STRING, allowNull: true },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
          defaultValue: "active",
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex("product_variations", ["product_id"], {
        name: "product_variations_product_id_idx",
      });
    }

    if (!tables.includes("product_variation_attribute_values")) {
      await queryInterface.createTable("product_variation_attribute_values", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        variation_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "product_variations", key: "id" },
          onDelete: "CASCADE",
        },
        attribute_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "product_attributes", key: "id" },
          onDelete: "CASCADE",
        },
        attribute_value_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "product_attribute_values", key: "id" },
          onDelete: "CASCADE",
        },
      });
      await queryInterface.addIndex(
        "product_variation_attribute_values",
        ["variation_id", "attribute_id"],
        { name: "pvav_variation_attribute_unique", unique: true }
      );
    }
  },
};
