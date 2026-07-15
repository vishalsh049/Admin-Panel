const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Audit trail of every request/response exchanged with the FShip API —
// written by services/fshipService.js so failures can be diagnosed and
// shipments retried with full context.
const FshipApiLog = sequelize.define(
  "FshipApiLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    apiName: { type: DataTypes.STRING, allowNull: false },
    request: { type: DataTypes.JSON, allowNull: true },
    response: { type: DataTypes.JSON, allowNull: true },
    httpStatus: { type: DataTypes.INTEGER, allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "fship_api_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = FshipApiLog;
