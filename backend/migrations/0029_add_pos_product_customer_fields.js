// Additive fields needed by the POS module: a barcode + default GST rate on
// simple products (today only ProductVariation has a barcode), and a
// nullable email on store_customers so POS can create walk-in customer
// records with just a name + phone (MySQL allows multiple NULLs under a
// UNIQUE index, so real emails stay unique).
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const products = await queryInterface.describeTable("products");

    if (!products.barcode) {
      await queryInterface.addColumn("products", "barcode", {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
      });
    }
    if (!products.gst_percent) {
      await queryInterface.addColumn("products", "gst_percent", {
        type: DataTypes.DECIMAL(6, 3),
        allowNull: true,
        defaultValue: 0,
      });
    }

    const customers = await queryInterface.describeTable("store_customers");
    if (customers.email && customers.email.allowNull === false) {
      await queryInterface.changeColumn("store_customers", "email", {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },
};
