const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreOrder = sequelize.define(
  "StoreOrder",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    customerName: { type: DataTypes.STRING, allowNull: false },
    customerEmail: { type: DataTypes.STRING, allowNull: false },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    items: { type: DataTypes.JSON, allowNull: false },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: { type: DataTypes.STRING, defaultValue: "cod" },
    status: {
      type: DataTypes.ENUM("pending", "processing", "shipped", "delivered", "cancelled"),
      defaultValue: "pending",
    },
    isPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "store_orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = StoreOrder;
