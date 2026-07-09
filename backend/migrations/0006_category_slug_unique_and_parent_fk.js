const slugify = require("../utils/slugify");

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id, name, slug FROM product_categories ORDER BY id ASC"
    );

    const usedSlugs = new Set();
    for (const row of rows) {
      const base = slugify(row.slug) || slugify(row.name) || `category-${row.id}`;
      let candidate = base;
      let suffix = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(candidate);

      if (candidate !== row.slug) {
        await queryInterface.sequelize.query(
          "UPDATE product_categories SET slug = :slug WHERE id = :id",
          { replacements: { slug: candidate, id: row.id } }
        );
      }
    }

    const indexes = await queryInterface.showIndex("product_categories");
    if (!indexes.some((i) => i.name === "product_categories_slug_unique")) {
      await queryInterface.addIndex("product_categories", ["slug"], {
        name: "product_categories_slug_unique",
        unique: true,
      });
    }

    try {
      await queryInterface.addConstraint("product_categories", {
        fields: ["parent_id"],
        type: "foreign key",
        name: "fk_product_categories_parent_id",
        references: { table: "product_categories", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    } catch (error) {
      if (!/Duplicate|already exists/i.test(error.message || "")) throw error;
    }
  },
};
