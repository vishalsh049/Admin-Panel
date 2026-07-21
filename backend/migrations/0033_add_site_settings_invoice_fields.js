// GST/company/banking details used by the unified order-invoice renderer
// (Phase 3) — added to the existing single-row site_settings table rather
// than a new table, matching how the rest of that table already models
// site-wide config as flat columns.
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const table = await queryInterface.describeTable("site_settings");

    const addIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("site_settings", name, definition);
      }
    };

    await addIfMissing("gstin", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("pan", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("invoice_prefix", { type: DataTypes.STRING, allowNull: false, defaultValue: "INV" });
    await addIfMissing("bank_name", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("bank_account_number", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("bank_ifsc", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("bank_branch", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("invoice_terms", { type: DataTypes.TEXT, allowNull: true });
    await addIfMissing("invoice_signature_path", { type: DataTypes.STRING, allowNull: true });
  },
};
