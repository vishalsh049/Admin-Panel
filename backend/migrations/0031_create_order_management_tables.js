// Order management module: notes, tags, a unified activity/timeline log, and
// a refunds ledger (Razorpay refunds can be partial and repeated — a single
// refundId/refundAmount pair on store_orders can't represent that history).
// All additive/new tables — no changes to existing store_orders columns here
// (see 0032 for that). Follows the raw-SQL convention used by
// 0025_create_purchase_module.js rather than adding new Sequelize models.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_order_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        note TEXT NOT NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_son_order (order_id),
        CONSTRAINT fk_son_order FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_son_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_order_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sot_name (name)
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_order_tag_map (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        tag_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sotm_order_tag (order_id, tag_id),
        CONSTRAINT fk_sotm_order FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_sotm_tag FOREIGN KEY (tag_id) REFERENCES store_order_tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_order_activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        type VARCHAR(40) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        meta JSON NULL,
        actor_id INT NULL,
        actor_name VARCHAR(255) NULL,
        actor_type VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_soal_order (order_id),
        CONSTRAINT fk_soal_order FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_order_refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reason VARCHAR(255) NULL,
        method VARCHAR(30) NOT NULL DEFAULT 'razorpay',
        razorpay_refund_id VARCHAR(100) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'initiated',
        items JSON NULL,
        initiated_by INT NULL,
        initiated_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_sor_order (order_id),
        CONSTRAINT fk_sor_order FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  },
};
