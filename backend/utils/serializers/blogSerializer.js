const toRelativeUploadPath = require("../toRelativeUploadPath");

// MySQL JSON columns come back from this Sequelize/mysql2 setup as raw
// strings rather than auto-parsed values (see services/integrationConfigService.js
// for the same workaround) — parse defensively either way.
function parseJsonValue(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function serializeCategory(category) {
  if (!category) return null;
  const data = category.toJSON ? category.toJSON() : category;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description || "",
    icon: data.icon || "Flame",
    tone: data.tone || "",
  };
}

function serializeAuthor(author) {
  if (!author) return null;
  const data = author.toJSON ? author.toJSON() : author;
  return {
    id: data.id,
    name: data.name,
    role: data.role || "",
    bio: data.bio || "",
    initials: data.initials || "",
    avatar: data.avatar_path ? toRelativeUploadPath(data.avatar_path) : null,
  };
}

/**
 * Single source of truth for shaping a BlogPost (+ category/author) into the
 * exact object shape frontend/src/data/blogPosts.js already produces, so the
 * storefront blog UI (built entirely against that mock shape) works unchanged
 * once services/blogService.js is repointed to this API.
 */
function buildBlogPostPayload(postInstance, { context = "public" } = {}) {
  const data = postInstance.toJSON ? postInstance.toJSON() : postInstance;
  const category = serializeCategory(data.category);
  const author = serializeAuthor(data.author);

  const base = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt || "",
    category,
    author,
    tags: parseJsonValue(data.tags, []),
    publishedAt: data.published_at || data.created_at,
    updatedAt: data.updated_at,
    readTime: data.read_time || 0,
    featured: !!data.is_featured,
    views: data.views || 0,
    tone: data.tone || category?.tone || "",
    content: parseJsonValue(data.content_json, []),
    featuredImage: data.featured_image ? toRelativeUploadPath(data.featured_image) : null,
    seo_title: data.seo_title || "",
    seo_description: data.seo_description || "",
    seo_keywords: data.seo_keywords || "",
  };

  if (context === "admin") {
    return {
      ...base,
      category_id: data.category_id,
      author_id: data.author_id,
      status: data.status || "draft",
    };
  }

  return base;
}

module.exports = { buildBlogPostPayload };
