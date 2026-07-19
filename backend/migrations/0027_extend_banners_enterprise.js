// Banner Management v2 — additive-only columns so the live banners table and
// existing storefront contract keep working untouched. New placements need no
// schema change (placement is a free string); these columns cover device
// targeting, richer content, a separate mobile image, and click/view counters.
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("banners");

    if (!table.device) {
      await queryInterface.addColumn("banners", "device", {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "all", // all | desktop | mobile
      });
    }
    if (!table.description) {
      await queryInterface.addColumn("banners", "description", {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
    if (!table.open_new_tab) {
      await queryInterface.addColumn("banners", "open_new_tab", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!table.mobile_image_path) {
      await queryInterface.addColumn("banners", "mobile_image_path", {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }
    if (!table.view_count) {
      await queryInterface.addColumn("banners", "view_count", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!table.click_count) {
      await queryInterface.addColumn("banners", "click_count", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },
};
