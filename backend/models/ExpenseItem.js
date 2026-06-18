const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ExpenseCategory = require("./ExpenseCategory");

const ExpenseItem = sequelize.define(
  "ExpenseItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    expenseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    notes: {
      type: DataTypes.STRING,
    },

    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    tableName: "expense_items", // ← IMPORTANT
    timestamps: true,
  }
);

ExpenseItem.belongsTo(ExpenseCategory, {
  foreignKey: "categoryId",
  as: "category",
});

module.exports = ExpenseItem;