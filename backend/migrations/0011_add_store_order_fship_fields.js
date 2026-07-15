module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("store_orders");

    if (!table.fshipOrderId) {
      await queryInterface.addColumn("store_orders", "fshipOrderId", {
        type: DataTypes.STRING,
        allowNull: true,
        field: "fshipOrderId",
      });
    }

    if (!table.fshipPickupId) {
      await queryInterface.addColumn("store_orders", "fshipPickupId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "fshipPickupId",
      });
    }

    if (!table.fshipResponse) {
      await queryInterface.addColumn("store_orders", "fshipResponse", {
        type: DataTypes.JSON,
        allowNull: true,
        field: "fshipResponse",
      });
    }
  },
};