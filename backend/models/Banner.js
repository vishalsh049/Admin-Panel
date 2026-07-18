const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Banner = sequelize.define(
  "Banner",
  {
    placement: { type: DataTypes.STRING, allowNull: false },
    eyebrow: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    cta_label: { type: DataTypes.STRING, allowNull: true, field: "cta_label" },
    cta_url: { type: DataTypes.STRING, allowNull: true, field: "cta_url" },
    tone: { type: DataTypes.STRING, allowNull: true },
    image_path: { type: DataTypes.STRING, allowNull: true, field: "image_path" },
    starts_at: { type: DataTypes.DATE, allowNull: true, field: "starts_at" },
    ends_at: { type: DataTypes.DATE, allowNull: true, field: "ends_at" },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, field: "sort_order" },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
  },
  {
    tableName: "banners",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Banner;
