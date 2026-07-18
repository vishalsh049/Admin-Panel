const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BlogCategory = sequelize.define(
  "BlogCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    icon: { type: DataTypes.STRING, allowNull: true },
    tone: { type: DataTypes.STRING, allowNull: true },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, field: "sort_order" },
  },
  {
    tableName: "blog_categories",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = BlogCategory;
