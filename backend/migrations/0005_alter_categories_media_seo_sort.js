module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("product_categories");

    const columns = {
      image: { type: DataTypes.STRING, allowNull: true },
      banner: { type: DataTypes.STRING, allowNull: true },
      icon: { type: DataTypes.STRING, allowNull: true },
      seo_title: { type: DataTypes.STRING, allowNull: true },
      seo_description: { type: DataTypes.TEXT, allowNull: true },
      seo_keywords: { type: DataTypes.STRING, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    };

    for (const [name, def] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn("product_categories", name, def);
      }
    }

    await queryInterface.sequelize.query(
      `UPDATE product_categories SET status = 'Active' WHERE LOWER(status) = 'active'`
    );
    await queryInterface.sequelize.query(
      `UPDATE product_categories SET status = 'Inactive' WHERE LOWER(status) <> 'active' OR status IS NULL`
    );

    const refreshedTable = await queryInterface.describeTable("product_categories");
    const isAlreadyEnum = (refreshedTable.status.type || "").toUpperCase().includes("ENUM");
    if (!isAlreadyEnum) {
      await queryInterface.sequelize.query(
        `ALTER TABLE product_categories MODIFY COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'`
      );
    }
  },
};
