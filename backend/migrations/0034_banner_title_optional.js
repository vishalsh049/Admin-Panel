// Banner Management — the Title field is now optional in the admin editor
// (eyebrow/subtitle/image alone are often enough for a purely visual banner).
// Column-level NOT NULL must be relaxed to match, or Sequelize inserts with
// title: null would fail at the DB layer even though the app no longer
// requires it.
module.exports = {
  async up(queryInterface, { DataTypes }) {
    await queryInterface.changeColumn("banners", "title", {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
  },
};
