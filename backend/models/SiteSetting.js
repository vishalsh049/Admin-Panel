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
    gstin: { type: DataTypes.STRING, allowNull: true },
    pan: { type: DataTypes.STRING, allowNull: true },
    invoice_prefix: { type: DataTypes.STRING, allowNull: false, defaultValue: "INV", field: "invoice_prefix" },
    bank_name: { type: DataTypes.STRING, allowNull: true, field: "bank_name" },
    bank_account_number: { type: DataTypes.STRING, allowNull: true, field: "bank_account_number" },
    bank_ifsc: { type: DataTypes.STRING, allowNull: true, field: "bank_ifsc" },
    bank_branch: { type: DataTypes.STRING, allowNull: true, field: "bank_branch" },
    invoice_terms: { type: DataTypes.TEXT, allowNull: true, field: "invoice_terms" },
    invoice_signature_path: { type: DataTypes.STRING, allowNull: true, field: "invoice_signature_path" },
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
