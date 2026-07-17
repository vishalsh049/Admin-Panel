const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductVariation = sequelize.define(
  "ProductVariation",
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "sku",
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "barcode",
    },
    regular_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "regular_price",
    },
    sale_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "sale_price",
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "stock",
    },
    stock_status: {
      type: DataTypes.ENUM("in_stock", "out_of_stock"),
      defaultValue: "in_stock",
      field: "stock_status",
    },
    image_path: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "image_path",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
      field: "status",
    },
    woo_variation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "woo_variation_id",
    },
  },
  {
    tableName: "product_variations",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ProductVariation;
