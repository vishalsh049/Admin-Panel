const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ExpenseCategory = sequelize.define("ExpenseCategory", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "Active",
  },
});

module.exports = ExpenseCategory;