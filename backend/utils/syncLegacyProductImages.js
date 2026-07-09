const { Product, ProductImage } = require("../models");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");

// The live admin panel's previous code path only ever wrote to the legacy
// `products.image` string column. Until every deployment is fully cut over
// to the new `product_images` gallery table, that legacy column can keep
// changing underneath us (e.g. a product edited through still-running old
// code). Run on every boot so the new primary-image source of truth never
// silently drifts from what an old client last wrote.
async function syncLegacyProductImages() {
  const products = await Product.findAll({
    where: {},
    attributes: ["id", "image"],
  });

  for (const product of products) {
    if (!product.image) continue;
    const normalized = toRelativeUploadPath(product.image);

    const primary = await ProductImage.findOne({
      where: { product_id: product.id, is_primary: true },
    });

    if (!primary) {
      await ProductImage.create({
        product_id: product.id,
        image_path: normalized,
        is_primary: true,
        sort_order: 0,
      });
    } else if (primary.image_path !== normalized) {
      await primary.update({ image_path: normalized });
    }
  }
}

module.exports = syncLegacyProductImages;
