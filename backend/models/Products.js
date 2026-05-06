const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define(
  "Product",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
    },
    description: {
      type: DataTypes.TEXT,
      field: "description",
    },
    regular_price: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  defaultValue: 0,
  field: "regular_price",
},
    sale_price: {
     type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "sale_price",
    },
    category: {
      type: DataTypes.STRING,
      field: "category",
    },
    sku: {
      type: DataTypes.STRING,
      field: "sku",
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "stock",
    },
    stock_status: {
  type: DataTypes.ENUM("in_stock", "out_of_stock"),
  defaultValue: "in_stock",
  field: "stock_status",
},
    status: {
      type: DataTypes.ENUM("draft", "publish"),
      defaultValue: "draft",
      field: "status",
    },
    source: {
      type: DataTypes.ENUM("admin", "woocommerce"),
      allowNull: false,
      defaultValue: "admin",
      field: "source",
    },
    image: {
      type: DataTypes.STRING,
   },
   hsn: {
  type: DataTypes.STRING,
  field: "hsn",
},

tax_class: {
  type: DataTypes.STRING,
  field: "tax_class",
},

tax_status: {
  type: DataTypes.STRING,
  field: "tax_status",
},

color: {
  type: DataTypes.STRING,
  field: "color",
},

size: {
  type: DataTypes.STRING,
  field: "size",
},

brand: {
  type: DataTypes.STRING,
  field: "brand",
},

weight: {
  type: DataTypes.DECIMAL(10, 2),
  field: "weight",
},

length: {
  type: DataTypes.DECIMAL(10, 2),
  field: "length",
},

width: {
  type: DataTypes.DECIMAL(10, 2),
  field: "width",
},

height: {
  type: DataTypes.DECIMAL(10, 2),
  field: "height",
},
  },
  {
    tableName: "products",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Product;
