const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define(
  "Expense",
  {
    /* BASIC INFO */

    expenseCode: {
      type: DataTypes.STRING,
      unique: true
    },

    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    vendorName: {
      type: DataTypes.STRING,
    },

    invoiceNo: {
      type: DataTypes.STRING,
    },

    place: {
      type: DataTypes.STRING,
    },

    amountPaid: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    amountPending: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    totalBeforeGst: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    gstAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    totalAfterGst: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    transportCharges: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    purchasePersonName: {
      type: DataTypes.STRING,
    },


    paidThrough: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: "Unpaid",
    },

    /* OTHER */
    notes: {
      type: DataTypes.TEXT,
    },

    receiptImage: {
      type: DataTypes.STRING,
    },

    invoicePdf: {
      type: DataTypes.STRING,
    },

    billFile: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  },

);

/* RELATION */
const ExpenseItem = require("./ExpenseItem");

Expense.hasMany(ExpenseItem, {
  foreignKey: "expenseId",
  onDelete: "CASCADE",
});

ExpenseItem.belongsTo(Expense, {
  foreignKey: "expenseId",
});

module.exports = Expense;