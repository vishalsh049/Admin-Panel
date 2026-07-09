const Category = require("../models/Category");
const Product = require("../models/Products");
const slugify = require("../utils/slugify");

module.exports = {
  async up(queryInterface, { Op }) {
    const products = await Product.findAll({ where: { category_id: null } });

    for (const product of products) {
      const raw = (product.category || "").trim();
      if (!raw) continue;

      const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
      const firstToken = tokens[0];
      if (!firstToken) continue;

      const extraTokens = tokens.slice(1);
      if (extraTokens.length > 0) {
        console.log(
          `[0002] Product #${product.id} "${product.name}": using "${firstToken}" as its category, discarding extra tokens from legacy multi-category text: ${extraTokens.join(", ")}`
        );
      }

      let category = await Category.findOne({
        where: { name: { [Op.like]: firstToken } },
      });

      if (!category) {
        category = await Category.create({
          name: firstToken,
          slug: slugify(firstToken),
          status: "Active",
        });
        console.log(`[0002] Created missing category "${firstToken}" for product #${product.id}`);
      }

      await product.update({ category_id: category.id });
    }
  },
};
