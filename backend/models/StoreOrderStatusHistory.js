const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreOrderStatusHistory = sequelize.define(
  "StoreOrderStatusHistory",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "store_order_status_history",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = StoreOrderStatusHistory;
