const { DataTypes } = require("sequelize");

async function ensureProductSourceColumn(sequelize) {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const tableDefinition = await queryInterface.describeTable("products");

    if (!tableDefinition.source) {
      await queryInterface.addColumn("products", "source", {
        type: DataTypes.ENUM("admin", "woocommerce"),
        allowNull: false,
        defaultValue: "admin",
      });
    }

    await sequelize.query(`
      UPDATE products
      SET source = 'admin'
      WHERE source IS NULL OR source = ''
    `);
  } catch (error) {
    const message = error?.original?.code || error?.message || "";

    if (
      message.includes("ER_NO_SUCH_TABLE") ||
      message.includes("doesn't exist")
    ) {
      return;
    }

    throw error;
  }
}

module.exports = ensureProductSourceColumn;
