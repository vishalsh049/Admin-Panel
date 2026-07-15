const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// One row per managed integration provider (razorpay, fship) — status is
// the admin enable/disable toggle shown on the Settings → Integrations cards.
const IntegrationProvider = sequelize.define(
  "IntegrationProvider",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    providerName: { type: DataTypes.STRING, allowNull: false, field: "provider_name" },
    providerCode: { type: DataTypes.STRING, allowNull: false, unique: true, field: "provider_code" },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "disabled" },
  },
  {
    tableName: "integration_providers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = IntegrationProvider;
