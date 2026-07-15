const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Audit trail for every change made to an integration's configuration or
// enable/disable state — written by controllers/integrationsController.js.
// old_value/new_value always have secrets masked before being stored.
const IntegrationAuditLog = sequelize.define(
  "IntegrationAuditLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    providerCode: { type: DataTypes.STRING, allowNull: false, field: "provider_code" },
    action: { type: DataTypes.STRING, allowNull: false },
    performedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: "performed_by_user_id" },
    performedByName: { type: DataTypes.STRING, allowNull: true, field: "performed_by_name" },
    performedByEmail: { type: DataTypes.STRING, allowNull: true, field: "performed_by_email" },
    ipAddress: { type: DataTypes.STRING, allowNull: true, field: "ip_address" },
    oldValue: { type: DataTypes.JSON, allowNull: true, field: "old_value" },
    newValue: { type: DataTypes.JSON, allowNull: true, field: "new_value" },
  },
  {
    tableName: "integration_audit_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = IntegrationAuditLog;
