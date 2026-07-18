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
const BlogCategory = require("./BlogCategory");
const BlogAuthor = require("./BlogAuthor");
const BlogPost = require("./BlogPost");
const MenuItem = require("./MenuItem");
const Banner = require("./Banner");
const Testimonial = require("./Testimonial");
const Page = require("./Page");

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

// Blog post <-> category / author
BlogCategory.hasMany(BlogPost, { as: "posts", foreignKey: "category_id" });
BlogPost.belongsTo(BlogCategory, { as: "category", foreignKey: "category_id" });

BlogAuthor.hasMany(BlogPost, { as: "posts", foreignKey: "author_id" });
BlogPost.belongsTo(BlogAuthor, { as: "author", foreignKey: "author_id" });

// Menu item parent/child (self-referential) + optional linked category/blog category
MenuItem.belongsTo(MenuItem, { as: "parent", foreignKey: "parent_id" });
MenuItem.hasMany(MenuItem, { as: "children", foreignKey: "parent_id" });
MenuItem.belongsTo(Category, { as: "categoryRef", foreignKey: "category_id" });
MenuItem.belongsTo(BlogCategory, { as: "blogCategoryRef", foreignKey: "blog_category_id" });

module.exports = {
  sequelize,
  Category,
  Product,
  ProductImage,
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
  ProductVariationAttributeValue,
  BlogCategory,
  BlogAuthor,
  BlogPost,
  MenuItem,
  Banner,
  Testimonial,
  Page,
};
