module.exports = {
  async up(queryInterface, { DataTypes }) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("product_attributes")) {
      await queryInterface.createTable("product_attributes", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
        },
        name: { type: DataTypes.STRING, allowNull: false },
        sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        is_for_variations: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex("product_attributes", ["product_id", "name"], {
        name: "product_attributes_product_name_unique",
        unique: true,
      });
    }

    if (!tables.includes("product_attribute_values")) {
      await queryInterface.createTable("product_attribute_values", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        attribute_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "product_attributes", key: "id" },
          onDelete: "CASCADE",
        },
        value: { type: DataTypes.STRING, allowNull: false },
        sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex("product_attribute_values", ["attribute_id", "value"], {
        name: "product_attribute_values_attr_value_unique",
        unique: true,
      });
    }
  },
};
