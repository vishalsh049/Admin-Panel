module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("products");

    if (!table.cost_price) {
      await queryInterface.addColumn("products", "cost_price", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      });
    }
    if (!table.low_stock_threshold) {
      await queryInterface.addColumn("products", "low_stock_threshold", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      });
    }
  },
};
