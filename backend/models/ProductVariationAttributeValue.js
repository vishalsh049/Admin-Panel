const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductVariationAttributeValue = sequelize.define(
  "ProductVariationAttributeValue",
  {
    variation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "variation_id",
    },
    attribute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "attribute_id",
    },
    attribute_value_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "attribute_value_id",
    },
  },
  {
    tableName: "product_variation_attribute_values",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = ProductVariationAttributeValue;
