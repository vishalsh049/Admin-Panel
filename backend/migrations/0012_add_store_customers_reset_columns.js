module.exports = {
  async up(queryInterface, { DataTypes, sequelize }) {
    const table = await queryInterface.describeTable("store_customers");

    // The StoreCustomer model gained these fields for the forgot-password
    // flow, but the live table was created before that and sync() never
    // alters existing tables (DB_SYNC=false). Every findOne/findAll on the
    // model SELECTs these columns, so their absence breaks register/login
    // with "Unknown column 'resetPasswordToken' in 'SELECT'".
    if (!table.resetPasswordToken) {
      await queryInterface.addColumn("store_customers", "resetPasswordToken", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!table.resetPasswordExpires) {
      await queryInterface.addColumn("store_customers", "resetPasswordExpires", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    // Past sync({ alter: true }) runs stacked a duplicate unique index on
    // email each time (email_2, email_3, ...). MySQL caps a table at 64
    // indexes, so drop every duplicate and keep the original `email` key.
    const [indexes] = await sequelize.query(
      "SHOW INDEX FROM store_customers WHERE Column_name = 'email'"
    );
    const duplicateKeys = [
      ...new Set(
        indexes
          .map((idx) => idx.Key_name)
          .filter((keyName) => /^email_\d+$/.test(keyName))
      ),
    ];
    for (const keyName of duplicateKeys) {
      await sequelize.query(`ALTER TABLE store_customers DROP INDEX \`${keyName}\``);
    }
  },
};
