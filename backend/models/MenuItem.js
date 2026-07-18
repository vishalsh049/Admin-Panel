const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MenuItem = sequelize.define(
  "MenuItem",
  {
    location: { type: DataTypes.STRING, allowNull: false },
    parent_id: { type: DataTypes.INTEGER, allowNull: true, field: "parent_id" },
    label: { type: DataTypes.STRING, allowNull: false },
    link_type: { type: DataTypes.STRING, defaultValue: "custom_url", field: "link_type" },
    url: { type: DataTypes.STRING, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true, field: "category_id" },
    blog_category_id: { type: DataTypes.INTEGER, allowNull: true, field: "blog_category_id" },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, field: "sort_order" },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
  },
  {
    tableName: "menu_items",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = MenuItem;
