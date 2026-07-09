const toRelativeUploadPath = require("../utils/toRelativeUploadPath");

module.exports = {
  async up(queryInterface, { DataTypes }) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("product_images")) {
      await queryInterface.createTable("product_images", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
        },
        image_path: { type: DataTypes.STRING, allowNull: false },
        is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        alt_text: { type: DataTypes.STRING, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex("product_images", ["product_id"], {
        name: "product_images_product_id_idx",
      });
    }

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, image FROM products WHERE image IS NOT NULL AND image <> ''"
    );
    const [existingImageRows] = await queryInterface.sequelize.query(
      "SELECT product_id FROM product_images"
    );
    const alreadyBackfilled = new Set(existingImageRows.map((r) => r.product_id));

    for (const row of rows) {
      if (alreadyBackfilled.has(row.id)) continue;
      const relativePath = toRelativeUploadPath(row.image);
      await queryInterface.sequelize.query(
        `INSERT INTO product_images (product_id, image_path, is_primary, sort_order, created_at, updated_at)
         VALUES (:product_id, :image_path, 1, 0, NOW(), NOW())`,
        { replacements: { product_id: row.id, image_path: relativePath } }
      );
    }
  },
};
