const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductImage = sequelize.define(
  "ProductImage",
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    image_path: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "image_path",
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_primary",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    alt_text: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "alt_text",
    },
  },
  {
    tableName: "product_images",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ProductImage;
