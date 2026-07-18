// Purchase management module: real vendors table (the old Vendors page kept
// them in localStorage only), purchase bills with items/payments/attachments,
// an append-only timeline (audit log), a vendor ledger (debit = bill,
// credit = payment) and a stock ledger written whenever an approved bill
// applies stock to products. All money columns DECIMAL to avoid float drift.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NULL,
        gstin VARCHAR(20) NULL,
        pan VARCHAR(15) NULL,
        gst_type VARCHAR(30) NOT NULL DEFAULT 'regular',
        phone VARCHAR(20) NULL,
        email VARCHAR(255) NULL,
        billing_address TEXT NULL,
        shipping_address TEXT NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        pincode VARCHAR(10) NULL,
        credit_days INT NOT NULL DEFAULT 0,
        opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
        rating TINYINT NOT NULL DEFAULT 0,
        notes TEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_vendors_name (name),
        KEY idx_vendors_gstin (gstin)
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_number VARCHAR(50) NOT NULL,
        vendor_id INT NULL,
        vendor_name VARCHAR(255) NOT NULL DEFAULT '',
        vendor_gstin VARCHAR(20) NULL,
        vendor_phone VARCHAR(20) NULL,
        vendor_email VARCHAR(255) NULL,
        vendor_state VARCHAR(100) NULL,
        billing_address TEXT NULL,
        shipping_address TEXT NULL,
        invoice_number VARCHAR(100) NULL,
        invoice_date DATE NULL,
        purchase_date DATE NOT NULL,
        due_date DATE NULL,
        warehouse VARCHAR(100) NOT NULL DEFAULT 'Main',
        reference_number VARCHAR(100) NULL,
        purchase_order_ref VARCHAR(100) NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1,
        payment_terms VARCHAR(100) NULL,
        gst_type VARCHAR(20) NOT NULL DEFAULT 'intra',
        reverse_charge TINYINT(1) NOT NULL DEFAULT 0,
        remarks TEXT NULL,
        internal_notes TEXT NULL,
        subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
        item_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        bill_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        cgst DECIMAL(14,2) NOT NULL DEFAULT 0,
        sgst DECIMAL(14,2) NOT NULL DEFAULT 0,
        igst DECIMAL(14,2) NOT NULL DEFAULT 0,
        cess DECIMAL(14,2) NOT NULL DEFAULT 0,
        shipping_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
        packing_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
        other_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
        tds_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        tds_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        round_off DECIMAL(8,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        balance_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        stock_applied TINYINT(1) NOT NULL DEFAULT 0,
        items_count INT NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        updated_by INT NULL,
        updated_by_name VARCHAR(255) NULL,
        approved_by INT NULL,
        approved_by_name VARCHAR(255) NULL,
        approved_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_purchase_bills_number (bill_number),
        KEY idx_pb_vendor (vendor_id),
        KEY idx_pb_status (status),
        KEY idx_pb_payment_status (payment_status),
        KEY idx_pb_purchase_date (purchase_date),
        KEY idx_pb_due_date (due_date),
        KEY idx_pb_invoice_number (invoice_number),
        CONSTRAINT fk_pb_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_bill_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        product_id INT NULL,
        product_name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NULL,
        hsn VARCHAR(50) NULL,
        description TEXT NULL,
        batch_number VARCHAR(100) NULL,
        expiry_date DATE NULL,
        unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
        quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
        free_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
        purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
        selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        gst_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        cess_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        cess_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        total DECIMAL(14,2) NOT NULL DEFAULT 0,
        KEY idx_pbi_bill (bill_id),
        KEY idx_pbi_product (product_id),
        CONSTRAINT fk_pbi_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
        CONSTRAINT fk_pbi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        vendor_id INT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        mode VARCHAR(30) NOT NULL DEFAULT 'cash',
        transaction_number VARCHAR(100) NULL,
        reference_number VARCHAR(100) NULL,
        bank_name VARCHAR(150) NULL,
        notes TEXT NULL,
        created_by INT NULL,
        created_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pp_bill (bill_id),
        KEY idx_pp_vendor (vendor_id),
        CONSTRAINT fk_pp_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_bill_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NULL,
        file_size INT NOT NULL DEFAULT 0,
        uploaded_by INT NULL,
        uploaded_by_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pba_bill (bill_id),
        CONSTRAINT fk_pba_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_bill_timeline (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT NULL,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pbt_bill (bill_id),
        CONSTRAINT fk_pbt_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendor_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        bill_id INT NULL,
        payment_id INT NULL,
        entry_date DATE NOT NULL,
        entry_type VARCHAR(30) NOT NULL,
        narration VARCHAR(500) NULL,
        debit DECIMAL(14,2) NOT NULL DEFAULT 0,
        credit DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_vl_vendor (vendor_id),
        KEY idx_vl_bill (bill_id),
        CONSTRAINT fk_vl_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        txn_type VARCHAR(30) NOT NULL,
        ref_type VARCHAR(30) NULL,
        ref_id INT NULL,
        warehouse VARCHAR(100) NOT NULL DEFAULT 'Main',
        qty_in DECIMAL(12,3) NOT NULL DEFAULT 0,
        qty_out DECIMAL(12,3) NOT NULL DEFAULT 0,
        balance_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        batch_number VARCHAR(100) NULL,
        expiry_date DATE NULL,
        narration VARCHAR(500) NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_sl_product (product_id),
        KEY idx_sl_ref (ref_type, ref_id),
        CONSTRAINT fk_sl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  },
};
