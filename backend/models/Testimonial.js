const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Testimonial = sequelize.define(
  "Testimonial",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    text: { type: DataTypes.TEXT, allowNull: false },
    rating: { type: DataTypes.INTEGER, defaultValue: 5 },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, field: "sort_order" },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
  },
  {
    tableName: "testimonials",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Testimonial;
