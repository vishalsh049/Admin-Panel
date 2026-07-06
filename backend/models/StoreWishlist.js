const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreWishlist = sequelize.define(
  "StoreWishlist",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "store_wishlists",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["customerId", "productId"] },
    ],
  }
);

module.exports = StoreWishlist;
