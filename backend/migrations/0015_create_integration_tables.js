module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS integration_providers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_name VARCHAR(100) NOT NULL,
        provider_code VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'disabled',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_integration_providers_code (provider_code)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS integration_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        environment VARCHAR(20) NOT NULL DEFAULT 'production',
        config_json JSON NULL,
        encrypted TINYINT(1) NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'untested',
        last_tested_at DATETIME NULL,
        last_error TEXT NULL,
        created_by_user_id INT NULL,
        updated_by_user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_integration_configs_provider_env (provider_id, environment),
        CONSTRAINT fk_integration_configs_provider
          FOREIGN KEY (provider_id) REFERENCES integration_providers(id)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS integration_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_code VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        performed_by_user_id INT NULL,
        performed_by_name VARCHAR(255) NULL,
        performed_by_email VARCHAR(255) NULL,
        ip_address VARCHAR(64) NULL,
        old_value JSON NULL,
        new_value JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_integration_audit_logs_provider_code (provider_code),
        INDEX idx_integration_audit_logs_created_at (created_at)
      )
    `);

    // Seed the exactly-two providers this system manages. fship starts
    // 'enabled' because it is already live in production (see migration
    // 0016 for its credential seed); razorpay starts 'disabled' because it
    // is currently unconfigured (storefront is COD-only until an admin
    // configures and enables it via the new UI).
    await sequelize.query(`
      INSERT INTO integration_providers (provider_name, provider_code, status)
      SELECT 'Razorpay', 'razorpay', 'disabled'
      WHERE NOT EXISTS (SELECT 1 FROM integration_providers WHERE provider_code = 'razorpay')
    `);
    await sequelize.query(`
      INSERT INTO integration_providers (provider_name, provider_code, status)
      SELECT 'FShip', 'fship', 'enabled'
      WHERE NOT EXISTS (SELECT 1 FROM integration_providers WHERE provider_code = 'fship')
    `);
  },
};
