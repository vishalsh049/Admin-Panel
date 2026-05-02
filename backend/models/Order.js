const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  date: DataTypes.DATE,

  paymentMethod: DataTypes.STRING

});

module.exports = Order;