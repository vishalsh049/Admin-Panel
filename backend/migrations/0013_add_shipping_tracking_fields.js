module.exports = {
  async up(queryInterface, { DataTypes, sequelize }) {
    const table = await queryInterface.describeTable("store_orders");

    const addIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("store_orders", name, definition);
      }
    };

    // Shipment identity returned by FShip createforwardorder
    await addIfMissing("routeCode", { type: DataTypes.STRING, allowNull: true });
    // not_created | pending (creation failed, retry allowed) | created |
    // pickup_registered | cancelled
    await addIfMissing("shippingStatus", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "not_created",
    });

    // Latest scan snapshot from FShip shipmentsummary
    await addIfMissing("trackingStatus", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("trackingLocation", { type: DataTypes.STRING, allowNull: true });
    await addIfMissing("trackingRemark", { type: DataTypes.TEXT, allowNull: true });
    await addIfMissing("lastScanAt", { type: DataTypes.DATE, allowNull: true });

    // Document URLs from FShip shippinglabelbypickupid
    await addIfMissing("labelUrl", { type: DataTypes.TEXT, allowNull: true });
    await addIfMissing("manifestUrl", { type: DataTypes.TEXT, allowNull: true });
    await addIfMissing("invoiceUrl", { type: DataTypes.TEXT, allowNull: true });

    // Request/response audit log for every FShip API call
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fship_api_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        apiName VARCHAR(255) NOT NULL,
        request JSON NULL,
        response JSON NULL,
        httpStatus INT NULL,
        success TINYINT(1) NOT NULL DEFAULT 0,
        errorMessage TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fship_api_logs_api_name (apiName),
        INDEX idx_fship_api_logs_created_at (created_at)
      )
    `);
  },
};
