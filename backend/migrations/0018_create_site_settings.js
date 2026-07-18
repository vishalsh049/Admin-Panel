// Single fixed-row (id=1) site-wide settings table. Seeded here with the
// real production values that were previously hardcoded in the storefront's
// Footer.jsx/Navbar.jsx, so switching those components to read from this
// table does not blank real contact info on cutover.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT PRIMARY KEY,
        site_name VARCHAR(255) NULL,
        logo_path VARCHAR(500) NULL,
        favicon_path VARCHAR(500) NULL,
        contact_email VARCHAR(255) NULL,
        contact_phone VARCHAR(50) NULL,
        contact_address TEXT NULL,
        social_facebook VARCHAR(500) NULL,
        social_instagram VARCHAR(500) NULL,
        social_youtube VARCHAR(500) NULL,
        social_whatsapp VARCHAR(500) NULL,
        announcement_bar_text VARCHAR(500) NULL,
        extra JSON NULL,
        updated_by_user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await sequelize.query(`
      INSERT INTO site_settings (
        id, site_name, contact_email, contact_phone, contact_address,
        social_facebook, social_instagram, social_youtube,
        announcement_bar_text
      )
      SELECT 1, 'Divya Darshnam', 'support@divyadarshnam.com', '+91 83869-77271',
        'Pingoria Enterprises, Ward No-13, Baba Hariram Mandir Road, Goluwala, Rajasthan - 335802, India',
        'https://www.facebook.com/divyadarshnam', 'https://www.instagram.com/divyadarshnam',
        'https://www.youtube.com/@Divya_Darshnam',
        'Free Shipping on all orders above ₹299 • Mala • Dhoop • Chandan • Kapoor & More'
      WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 1)
    `);
  },
};
