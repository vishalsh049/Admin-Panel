// Adds WordPress origin columns to blog_posts so the WordPress blog import
// (services/wpBlogSyncService.js) is idempotent: re-running the sync updates
// the same local rows instead of creating duplicates, matched by wp_post_id
// (or slug as a fallback). wp_modified_at mirrors WordPress's modified_gmt so
// an unchanged post can be skipped instead of re-downloading its images.
// Same pattern as 0017_add_woocommerce_import_ids.js.
module.exports = {
  async up(queryInterface, { DataTypes }) {
    const postsTable = await queryInterface.describeTable("blog_posts");
    if (!postsTable.wp_post_id) {
      await queryInterface.addColumn("blog_posts", "wp_post_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    if (!postsTable.wp_modified_at) {
      await queryInterface.addColumn("blog_posts", "wp_modified_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
    const postIndexes = await queryInterface.showIndex("blog_posts");
    if (!postIndexes.some((i) => i.name === "blog_posts_wp_post_id_unique")) {
      await queryInterface.addIndex("blog_posts", ["wp_post_id"], {
        name: "blog_posts_wp_post_id_unique",
        unique: true,
      });
    }
  },
};
