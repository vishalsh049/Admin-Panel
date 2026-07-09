const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductAttribute = sequelize.define(
  "ProductAttribute",
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    is_for_variations: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_for_variations",
    },
  },
  {
    tableName: "product_attributes",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ProductAttribute;
