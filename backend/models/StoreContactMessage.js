const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StoreContactMessage = sequelize.define(
  "StoreContactMessage",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    subject: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("new", "read", "replied", "closed"),
      defaultValue: "new",
    },
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    adminReply: { type: DataTypes.TEXT, allowNull: true },
    repliedAt: { type: DataTypes.DATE, allowNull: true },
    repliedBy: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "store_contact_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = StoreContactMessage;
