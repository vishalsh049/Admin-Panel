// Backend Blog tables, shaped to match the payload frontend/src/data/blogPosts.js
// already returns via the mock frontend/src/services/blogService.js, so the
// existing storefront blog UI (components/blog/*) can be rewired to a real
// API without any component changes. No content is seeded — the mock posts
// are placeholder/demo content, not real production content.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT NULL,
        icon VARCHAR(50) NULL,
        tone VARCHAR(255) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blog_categories_slug (slug)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NULL,
        bio TEXT NULL,
        initials VARCHAR(10) NULL,
        avatar_path VARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) NOT NULL,
        excerpt TEXT NULL,
        content_json JSON NULL,
        category_id INT NULL,
        author_id INT NULL,
        tags JSON NULL,
        tone VARCHAR(255) NULL,
        featured_image VARCHAR(500) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        views INT NOT NULL DEFAULT 0,
        read_time INT NULL,
        published_at DATETIME NULL,
        seo_title VARCHAR(255) NULL,
        seo_description TEXT NULL,
        seo_keywords VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_blog_posts_slug (slug),
        INDEX idx_blog_posts_status (status),
        INDEX idx_blog_posts_deleted_at (deleted_at),
        CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id) REFERENCES blog_categories(id),
        CONSTRAINT fk_blog_posts_author FOREIGN KEY (author_id) REFERENCES blog_authors(id)
      )
    `);
  },
};
