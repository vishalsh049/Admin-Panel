const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Single fixed-row table (id always 1) — see migrations/0018_create_site_settings.js.
const SiteSetting = sequelize.define(
  "SiteSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    site_name: { type: DataTypes.STRING, allowNull: true, field: "site_name" },
    logo_path: { type: DataTypes.STRING, allowNull: true, field: "logo_path" },
    favicon_path: { type: DataTypes.STRING, allowNull: true, field: "favicon_path" },
    contact_email: { type: DataTypes.STRING, allowNull: true, field: "contact_email" },
    contact_phone: { type: DataTypes.STRING, allowNull: true, field: "contact_phone" },
    contact_address: { type: DataTypes.TEXT, allowNull: true, field: "contact_address" },
    social_facebook: { type: DataTypes.STRING, allowNull: true, field: "social_facebook" },
    social_instagram: { type: DataTypes.STRING, allowNull: true, field: "social_instagram" },
    social_youtube: { type: DataTypes.STRING, allowNull: true, field: "social_youtube" },
    social_whatsapp: { type: DataTypes.STRING, allowNull: true, field: "social_whatsapp" },
    announcement_bar_text: { type: DataTypes.STRING, allowNull: true, field: "announcement_bar_text" },
    extra: { type: DataTypes.JSON, allowNull: true },
    updated_by_user_id: { type: DataTypes.INTEGER, allowNull: true, field: "updated_by_user_id" },
  },
  {
    tableName: "site_settings",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = SiteSetting;
