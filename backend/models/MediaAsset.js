const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MediaAsset = sequelize.define(
  "MediaAsset",
  {
    file_name: { type: DataTypes.STRING, allowNull: false, field: "file_name" },
    original_name: { type: DataTypes.STRING, allowNull: true, field: "original_name" },
    path: { type: DataTypes.STRING, allowNull: false },
    mime_type: { type: DataTypes.STRING, allowNull: true, field: "mime_type" },
    size_bytes: { type: DataTypes.INTEGER, allowNull: true, field: "size_bytes" },
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    alt_text: { type: DataTypes.STRING, allowNull: true, field: "alt_text" },
    title: { type: DataTypes.STRING, allowNull: true },
    folder: { type: DataTypes.STRING, allowNull: true },
    uploaded_by_user_id: { type: DataTypes.INTEGER, allowNull: true, field: "uploaded_by_user_id" },
  },
  {
    tableName: "media_assets",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true,
    deletedAt: "deleted_at",
  }
);

module.exports = MediaAsset;
