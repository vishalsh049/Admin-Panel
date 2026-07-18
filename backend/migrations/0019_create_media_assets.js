// Shared Media Library table — the upload target for any admin screen that
// needs "pick an image" without a dedicated per-entity upload pipeline
// (blog featured images, banner images, site logo). See middleware/mediaUpload.js.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NULL,
        path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NULL,
        size_bytes INT NULL,
        width INT NULL,
        height INT NULL,
        alt_text VARCHAR(255) NULL,
        title VARCHAR(255) NULL,
        folder VARCHAR(100) NULL,
        uploaded_by_user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_media_assets_deleted_at (deleted_at)
      )
    `);
  },
};
