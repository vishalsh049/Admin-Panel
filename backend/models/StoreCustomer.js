const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");

const StoreCustomer = sequelize.define(
  "StoreCustomer",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
    resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
    woo_customer_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "store_customers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

StoreCustomer.beforeSave(async (customer) => {
  if (customer.changed("password")) {
    customer.password = await bcrypt.hash(customer.password, 10);
  }
});

StoreCustomer.prototype.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = StoreCustomer;
