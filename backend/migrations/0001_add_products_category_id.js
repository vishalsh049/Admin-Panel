module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("products");

    if (!table.category_id) {
      await queryInterface.addColumn("products", "category_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex("products");
    if (!indexes.some((i) => i.name === "products_category_id_idx")) {
      await queryInterface.addIndex("products", ["category_id"], {
        name: "products_category_id_idx",
      });
    }

    try {
      await queryInterface.addConstraint("products", {
        fields: ["category_id"],
        type: "foreign key",
        name: "fk_products_category_id",
        references: { table: "product_categories", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    } catch (error) {
      if (!/Duplicate|already exists/i.test(error.message || "")) throw error;
    }
  },
};
