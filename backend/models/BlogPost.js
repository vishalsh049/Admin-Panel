const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BlogPost = sequelize.define(
  "BlogPost",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    excerpt: { type: DataTypes.TEXT, allowNull: true },
    content_json: { type: DataTypes.JSON, allowNull: true, field: "content_json" },
    category_id: { type: DataTypes.INTEGER, allowNull: true, field: "category_id" },
    author_id: { type: DataTypes.INTEGER, allowNull: true, field: "author_id" },
    tags: { type: DataTypes.JSON, allowNull: true },
    tone: { type: DataTypes.STRING, allowNull: true },
    featured_image: { type: DataTypes.STRING, allowNull: true, field: "featured_image" },
    status: { type: DataTypes.ENUM("draft", "published"), defaultValue: "draft" },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_featured" },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    read_time: { type: DataTypes.INTEGER, allowNull: true, field: "read_time" },
    published_at: { type: DataTypes.DATE, allowNull: true, field: "published_at" },
    seo_title: { type: DataTypes.STRING, allowNull: true, field: "seo_title" },
    seo_description: { type: DataTypes.TEXT, allowNull: true, field: "seo_description" },
    seo_keywords: { type: DataTypes.STRING, allowNull: true, field: "seo_keywords" },
    wp_post_id: { type: DataTypes.INTEGER, allowNull: true, unique: true, field: "wp_post_id" },
    wp_modified_at: { type: DataTypes.DATE, allowNull: true, field: "wp_modified_at" },
  },
  {
    tableName: "blog_posts",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true,
    deletedAt: "deleted_at",
  }
);

module.exports = BlogPost;
