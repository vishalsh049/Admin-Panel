const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Role = sequelize.define(
  "Role",
  {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    display_name: { type: DataTypes.STRING, allowNull: false, field: "display_name" },
    description: { type: DataTypes.STRING, allowNull: true },
    permissions: { type: DataTypes.JSON, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_system" },
  },
  {
    tableName: "roles",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Role;
