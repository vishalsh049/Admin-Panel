// POS (walk-in retail billing) module: sale header + items + split payments,
// an append-only timeline (mirrors purchase_bill_timeline) and a returns
// pair for partial/full refunds. Stock movement is NOT tracked here — POS
// sales write to the existing `stock_ledger` table (txn_type 'sale' /
// 'sale_return', ref_type 'pos_sale'), same table purchase bills use, so
// there is a single unified stock trail across both modules.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_number VARCHAR(50) NOT NULL,
        customer_id INT NULL,
        customer_name VARCHAR(255) NULL,
        customer_phone VARCHAR(20) NULL,
        customer_email VARCHAR(255) NULL,
        warehouse VARCHAR(100) NOT NULL DEFAULT 'Main',
        subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
        item_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        bill_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        cgst DECIMAL(14,2) NOT NULL DEFAULT 0,
        sgst DECIMAL(14,2) NOT NULL DEFAULT 0,
        igst DECIMAL(14,2) NOT NULL DEFAULT 0,
        cess DECIMAL(14,2) NOT NULL DEFAULT 0,
        round_off DECIMAL(8,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        gst_type VARCHAR(20) NOT NULL DEFAULT 'intra',
        coupon_code VARCHAR(50) NULL,
        coupon_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        items_count INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'held',
        idempotency_key VARCHAR(64) NULL,
        notes TEXT NULL,
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        voided_by INT NULL,
        voided_by_name VARCHAR(255) NULL,
        void_reason VARCHAR(500) NULL,
        completed_at DATETIME NULL,
        voided_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pos_sales_number (sale_number),
        UNIQUE KEY uq_pos_sales_idempotency (idempotency_key),
        KEY idx_ps_customer (customer_id),
        KEY idx_ps_status (status),
        KEY idx_ps_created_at (created_at),
        CONSTRAINT fk_ps_customer FOREIGN KEY (customer_id) REFERENCES store_customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        product_id INT NULL,
        variation_id INT NULL,
        product_name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NULL,
        hsn VARCHAR(50) NULL,
        unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
        quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        gst_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        total DECIMAL(14,2) NOT NULL DEFAULT 0,
        returned_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
        KEY idx_psi_sale (sale_id),
        KEY idx_psi_product (product_id),
        CONSTRAINT fk_psi_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id) ON DELETE CASCADE,
        CONSTRAINT fk_psi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        method VARCHAR(20) NOT NULL DEFAULT 'cash',
        amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        reference_number VARCHAR(100) NULL,
        notes VARCHAR(500) NULL,
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pp_sale (sale_id),
        CONSTRAINT fk_psp_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_sale_timeline (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT NULL,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pst_sale (sale_id),
        CONSTRAINT fk_pst_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        return_number VARCHAR(50) NOT NULL,
        reason VARCHAR(500) NULL,
        refund_method VARCHAR(20) NOT NULL DEFAULT 'cash',
        refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pos_returns_number (return_number),
        KEY idx_pr_sale (sale_id),
        CONSTRAINT fk_pr_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pos_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        sale_item_id INT NOT NULL,
        product_id INT NULL,
        quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        KEY idx_pri_return (return_id),
        KEY idx_pri_sale_item (sale_item_id),
        CONSTRAINT fk_pri_return FOREIGN KEY (return_id) REFERENCES pos_returns(id) ON DELETE CASCADE,
        CONSTRAINT fk_pri_sale_item FOREIGN KEY (sale_item_id) REFERENCES pos_sale_items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  },
};
