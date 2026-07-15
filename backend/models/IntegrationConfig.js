const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Per-provider, per-environment credential/config storage. Secret fields
// inside config_json are encrypted individually (see utils/encryption.js)
// before this row is written — never stored or returned as plaintext.
const IntegrationConfig = sequelize.define(
  "IntegrationConfig",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    providerId: { type: DataTypes.INTEGER, allowNull: false, field: "provider_id" },
    environment: { type: DataTypes.STRING, allowNull: false, defaultValue: "production" },
    configJson: { type: DataTypes.JSON, allowNull: true, field: "config_json" },
    encrypted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "untested" },
    lastTestedAt: { type: DataTypes.DATE, allowNull: true, field: "last_tested_at" },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: "last_error" },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true, field: "created_by_user_id" },
    updatedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: "updated_by_user_id" },
  },
  {
    tableName: "integration_configs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = IntegrationConfig;
