// Read-only report of duplicate/broken data risks in the product & category
// catalog. Makes no writes — run any time to get real numbers before
// deciding whether to add DB-level constraints (e.g. a unique index on
// Product.sku) or run manual cleanup. Usage: node scripts/audit-duplicates.js
require("dotenv").config();

const { Op } = require("sequelize");
const { sequelize, Product, Category, ProductImage } = require("../models");

async function findDuplicates(model, field, extraWhere = {}) {
  const rows = await model.findAll({
    attributes: [field, [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { [field]: { [Op.ne]: null }, ...extraWhere },
    group: [field],
    having: sequelize.where(sequelize.fn("COUNT", sequelize.col("id")), { [Op.gt]: 1 }),
    raw: true,
  });
  return rows.map((r) => ({ value: r[field], count: Number(r.count) }));
}

async function run() {
  try {
    await sequelize.authenticate();

    const duplicateSkus = await findDuplicates(Product, "sku");
    const duplicateProductSlugs = await findDuplicates(Product, "slug");
    const duplicateCategoryNames = await findDuplicates(Category, "name");
    const duplicateCategorySlugs = await findDuplicates(Category, "slug");

    const productsWithNoImages = await sequelize.query(
      `SELECT p.id, p.name FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE pi.id IS NULL AND p.status = 'publish'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const report = {
      generatedAt: new Date().toISOString(),
      duplicateSkus,
      duplicateProductSlugs,
      duplicateCategoryNames,
      duplicateCategorySlugs,
      publishedProductsWithNoImages: {
        count: productsWithNoImages.length,
        sample: productsWithNoImages.slice(0, 20),
      },
    };

    console.log(JSON.stringify(report, null, 2));
    console.log("\n--- Summary ---");
    console.log(`Duplicate SKUs: ${duplicateSkus.length} value(s)`);
    console.log(`Duplicate product slugs: ${duplicateProductSlugs.length} value(s)`);
    console.log(`Duplicate category names: ${duplicateCategoryNames.length} value(s)`);
    console.log(`Duplicate category slugs: ${duplicateCategorySlugs.length} value(s)`);
    console.log(`Published products with zero images: ${productsWithNoImages.length}`);
    console.log("\nThis script made no changes. Review the values above before adding any DB constraint or running cleanup.");

    process.exit(0);
  } catch (error) {
    console.error("Audit failed:", error.message || error);
    process.exit(1);
  }
}

run();
