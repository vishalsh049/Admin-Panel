const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Category = sequelize.define(
  "Category",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    banner: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    seo_title: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "seo_title",
    },

    seo_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "seo_description",
    },

    seo_keywords: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "seo_keywords",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },

    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_featured",
    },
  },
  {
    tableName: "product_categories",
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
    deletedAt: "deleted_at",
  }
);

module.exports = Category;
