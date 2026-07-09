const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductAttributeValue = sequelize.define(
  "ProductAttributeValue",
  {
    attribute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "attribute_id",
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "value",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
  },
  {
    tableName: "product_attribute_values",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ProductAttributeValue;
