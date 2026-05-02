const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ExpenseCategory = require("./ExpenseCategory");

const ExpenseItem = sequelize.define("ExpenseItem", {
  expenseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: DataTypes.STRING,
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
});

ExpenseItem.belongsTo(ExpenseCategory, {
  foreignKey: "categoryId",
  as: "category"
});

module.exports = ExpenseItem;