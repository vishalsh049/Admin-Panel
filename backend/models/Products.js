const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define(
  "Product",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
    },
    description: {
      type: DataTypes.TEXT,
      field: "description",
    },
    regular_price: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  defaultValue: 0,
  field: "regular_price",
},
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: "sale_price",
    },
    category: {
      type: DataTypes.STRING,
      field: "category",
    },
    sku: {
      type: DataTypes.STRING,
      field: "sku",
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "stock",
    },
    status: {
      type: DataTypes.ENUM("draft", "publish"),
      defaultValue: "draft",
      field: "status",
    },
    source: {
      type: DataTypes.ENUM("admin", "woocommerce"),
      allowNull: false,
      defaultValue: "admin",
      field: "source",
    },
    imageUrl: {
      type: DataTypes.TEXT,
      field: "image_url",
    },
  },
  {
    tableName: "products",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Product;
