const sequelize = require("../config/db");

const Category = require("./Category");
const Product = require("./Products");
const ProductImage = require("./ProductImage");
const ProductAttribute = require("./ProductAttribute");
const ProductAttributeValue = require("./ProductAttributeValue");
const ProductVariation = require("./ProductVariation");
const ProductVariationAttributeValue = require("./ProductVariationAttributeValue");
require("./ExpenseCategory");
require("./ExpenseItem");
require("./Expense");
require("./Order");

// Category parent/child (self-referential)
Category.belongsTo(Category, { as: "parent", foreignKey: "parent_id" });
Category.hasMany(Category, { as: "children", foreignKey: "parent_id" });

// Category <-> Product
Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "categoryRef" });

// Product -> gallery images
Product.hasMany(ProductImage, {
  as: "images",
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
ProductImage.belongsTo(Product, { foreignKey: "product_id" });

// Product -> attributes -> values
Product.hasMany(ProductAttribute, {
  as: "attributes",
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
ProductAttribute.belongsTo(Product, { foreignKey: "product_id" });

ProductAttribute.hasMany(ProductAttributeValue, {
  as: "values",
  foreignKey: "attribute_id",
  onDelete: "CASCADE",
});
ProductAttributeValue.belongsTo(ProductAttribute, {
  as: "attribute",
  foreignKey: "attribute_id",
});

// Product -> variations
Product.hasMany(ProductVariation, {
  as: "variations",
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
ProductVariation.belongsTo(Product, { foreignKey: "product_id" });

// Variation <-> attribute values (through join table)
ProductVariation.belongsToMany(ProductAttributeValue, {
  through: ProductVariationAttributeValue,
  as: "attributeValues",
  foreignKey: "variation_id",
  otherKey: "attribute_value_id",
});
ProductAttributeValue.belongsToMany(ProductVariation, {
  through: ProductVariationAttributeValue,
  foreignKey: "attribute_value_id",
  otherKey: "variation_id",
});

ProductVariation.hasMany(ProductVariationAttributeValue, {
  as: "attributeLinks",
  foreignKey: "variation_id",
  onDelete: "CASCADE",
});
ProductVariationAttributeValue.belongsTo(ProductAttribute, {
  as: "attribute",
  foreignKey: "attribute_id",
});
ProductVariationAttributeValue.belongsTo(ProductAttributeValue, {
  as: "attributeValue",
  foreignKey: "attribute_value_id",
});

module.exports = {
  sequelize,
  Category,
  Product,
  ProductImage,
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
  ProductVariationAttributeValue,
};
