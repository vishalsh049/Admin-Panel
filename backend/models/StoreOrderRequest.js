const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreOrderRequest = sequelize.define(
  "StoreOrderRequest",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM("return", "exchange", "refund", "complaint"),
      allowNull: false,
    },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "completed"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "store_order_requests",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = StoreOrderRequest;
