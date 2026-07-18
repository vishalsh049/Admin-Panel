const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BlogAuthor = sequelize.define(
  "BlogAuthor",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    initials: { type: DataTypes.STRING, allowNull: true },
    avatar_path: { type: DataTypes.STRING, allowNull: true, field: "avatar_path" },
  },
  {
    tableName: "blog_authors",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = BlogAuthor;
