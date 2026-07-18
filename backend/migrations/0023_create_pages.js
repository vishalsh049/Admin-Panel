// Page Builder — admin-created pages (landing/festival/offer/custom) built
// from an ordered list of typed content blocks (blocks_json), rendered by the
// storefront at /pages/:slug. Block vocabulary is a superset of the blog's
// (paragraph/heading/list/quote) plus hero/image/cta_banner/faq. No seed —
// pages start empty until an admin creates one.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) NOT NULL,
        blocks_json JSON NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        seo_title VARCHAR(255) NULL,
        seo_description TEXT NULL,
        seo_keywords VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_pages_slug (slug),
        INDEX idx_pages_status (status),
        INDEX idx_pages_deleted_at (deleted_at)
      )
    `);
  },
};
