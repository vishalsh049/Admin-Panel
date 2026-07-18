const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Page = sequelize.define(
  "Page",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    blocks_json: { type: DataTypes.JSON, allowNull: true, field: "blocks_json" },
    status: { type: DataTypes.ENUM("draft", "published"), defaultValue: "draft" },
    seo_title: { type: DataTypes.STRING, allowNull: true, field: "seo_title" },
    seo_description: { type: DataTypes.TEXT, allowNull: true, field: "seo_description" },
    seo_keywords: { type: DataTypes.STRING, allowNull: true, field: "seo_keywords" },
  },
  {
    tableName: "pages",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true,
    deletedAt: "deleted_at",
  }
);

module.exports = Page;
