module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("products");
    if (!table.short_description) {
      await queryInterface.addColumn("products", "short_description", {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
  },
};
