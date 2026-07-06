const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreAddress = sequelize.define(
  "StoreAddress",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    label: { type: DataTypes.STRING, defaultValue: "home" },
    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    addressLine: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    postalCode: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, defaultValue: "India" },
    isDefaultShipping: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDefaultBilling: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "store_addresses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = StoreAddress;
