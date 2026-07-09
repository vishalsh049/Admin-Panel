const slugify = require("../utils/slugify");

module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("products");

    const columns = {
      slug: { type: DataTypes.STRING, allowNull: true },
      seo_title: { type: DataTypes.STRING, allowNull: true },
      seo_description: { type: DataTypes.TEXT, allowNull: true },
      seo_keywords: { type: DataTypes.STRING, allowNull: true },
      is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_best_seller: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_new_arrival: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_trending: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      has_variations: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    };

    for (const [name, def] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn("products", name, def);
      }
    }

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, name, slug FROM products WHERE slug IS NULL OR slug = ''"
    );
    const [existingSlugRows] = await queryInterface.sequelize.query(
      "SELECT slug FROM products WHERE slug IS NOT NULL AND slug <> ''"
    );
    const usedSlugs = new Set(existingSlugRows.map((r) => r.slug));

    for (const row of rows) {
      const base = slugify(row.name) || `product-${row.id}`;
      let candidate = base;
      let suffix = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(candidate);

      await queryInterface.sequelize.query(
        "UPDATE products SET slug = :slug WHERE id = :id",
        { replacements: { slug: candidate, id: row.id } }
      );
    }

    const indexes = await queryInterface.showIndex("products");
    if (!indexes.some((i) => i.name === "products_slug_unique")) {
      await queryInterface.addIndex("products", ["slug"], {
        name: "products_slug_unique",
        unique: true,
      });
    }
  },
};
