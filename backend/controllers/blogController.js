const { Op } = require("sequelize");
const BlogPost = require("../models/BlogPost");
const BlogCategory = require("../models/BlogCategory");
const BlogAuthor = require("../models/BlogAuthor");
const slugify = require("../utils/slugify");
const { buildBlogPostPayload } = require("../utils/serializers/blogSerializer");
const { syncWordPressPosts } = require("../services/wpBlogSyncService");
const { describeError: describeWpError } = require("../services/wooCommerceService");

const POST_INCLUDES = [
  { model: BlogCategory, as: "category" },
  { model: BlogAuthor, as: "author" },
];

async function generateUniqueSlug(title, excludeId = null) {
  const base = slugify(title) || `post-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (
    await BlogPost.findOne({
      where: excludeId ? { slug: candidate, id: { [Op.ne]: excludeId } } : { slug: candidate },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/* ───────────────────────── ADMIN: POSTS ───────────────────────── */

exports.adminGetPosts = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) where.title = { [Op.like]: `%${req.query.search}%` };

    const posts = await BlogPost.findAll({
      where,
      include: POST_INCLUDES,
      order: [["created_at", "DESC"]],
    });
    res.json(posts.map((p) => buildBlogPostPayload(p, { context: "admin" })));
  } catch (err) {
    console.error("ADMIN GET BLOG POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminGetPost = async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id, { include: POST_INCLUDES });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(buildBlogPostPayload(post, { context: "admin" }));
  } catch (err) {
    console.error("ADMIN GET BLOG POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreatePost = async (req, res) => {
  try {
    const body = req.body;
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const slug = await generateUniqueSlug(body.slug && body.slug.trim() ? body.slug : body.title);
    const status = body.status === "published" ? "published" : "draft";

    const post = await BlogPost.create({
      title: body.title,
      slug,
      excerpt: body.excerpt || null,
      content_json: Array.isArray(body.content) ? body.content : [],
      category_id: body.category_id || null,
      author_id: body.author_id || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      tone: body.tone || null,
      featured_image: body.featured_image || null,
      status,
      is_featured: !!body.is_featured,
      read_time: body.read_time ? Number(body.read_time) : null,
      published_at: status === "published" ? new Date() : null,
      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,
      seo_keywords: body.seo_keywords || null,
    });

    const full = await BlogPost.findByPk(post.id, { include: POST_INCLUDES });
    res.json({ success: true, post: buildBlogPostPayload(full, { context: "admin" }) });
  } catch (err) {
    console.error("ADMIN CREATE BLOG POST ERROR:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};

exports.adminUpdatePost = async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const body = req.body;
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const slug =
      body.slug && body.slug.trim() && body.slug.trim() !== post.slug
        ? await generateUniqueSlug(body.slug, post.id)
        : post.slug;

    const nextStatus = body.status === "published" ? "published" : "draft";
    const becomingPublished = nextStatus === "published" && post.status !== "published";

    await post.update({
      title: body.title,
      slug,
      excerpt: body.excerpt ?? post.excerpt,
      content_json: Array.isArray(body.content) ? body.content : post.content_json,
      category_id: body.category_id !== undefined ? body.category_id || null : post.category_id,
      author_id: body.author_id !== undefined ? body.author_id || null : post.author_id,
      tags: Array.isArray(body.tags) ? body.tags : post.tags,
      tone: body.tone ?? post.tone,
      featured_image: body.featured_image !== undefined ? body.featured_image : post.featured_image,
      status: nextStatus,
      is_featured: body.is_featured !== undefined ? !!body.is_featured : post.is_featured,
      read_time: body.read_time !== undefined ? Number(body.read_time) || null : post.read_time,
      published_at: becomingPublished ? new Date() : post.published_at,
      seo_title: body.seo_title ?? post.seo_title,
      seo_description: body.seo_description ?? post.seo_description,
      seo_keywords: body.seo_keywords ?? post.seo_keywords,
    });

    const full = await BlogPost.findByPk(post.id, { include: POST_INCLUDES });
    res.json({ success: true, post: buildBlogPostPayload(full, { context: "admin" }) });
  } catch (err) {
    console.error("ADMIN UPDATE BLOG POST ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeletePost = async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    await post.destroy();
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("ADMIN DELETE BLOG POST ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── ADMIN: CATEGORIES ───────────────────────── */

exports.adminGetCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.findAll({ order: [["sort_order", "ASC"], ["name", "ASC"]] });
    res.json(categories);
  } catch (err) {
    console.error("ADMIN GET BLOG CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreateCategory = async (req, res) => {
  try {
    const { name, description, icon, tone, sort_order } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name required" });

    const base = slugify(name) || `category-${Date.now()}`;
    let slug = base;
    let suffix = 2;
    while (await BlogCategory.findOne({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    const category = await BlogCategory.create({
      name,
      slug,
      description: description || null,
      icon: icon || "Flame",
      tone: tone || null,
      sort_order: Number(sort_order) || 0,
    });
    res.json({ success: true, category });
  } catch (err) {
    console.error("ADMIN CREATE BLOG CATEGORY ERROR:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.adminUpdateCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    const { name, description, icon, tone, sort_order } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name required" });

    await category.update({
      name,
      description: description ?? category.description,
      icon: icon || category.icon,
      tone: tone ?? category.tone,
      sort_order: sort_order !== undefined ? Number(sort_order) || 0 : category.sort_order,
    });
    res.json({ success: true, category });
  } catch (err) {
    console.error("ADMIN UPDATE BLOG CATEGORY ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeleteCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    // paranoid:false — a soft-deleted post still physically references this
    // category via FK, so it would still block a hard delete even though the
    // default paranoid count would (misleadingly) report zero.
    const postCount = await BlogPost.count({ where: { category_id: category.id }, paranoid: false });
    if (postCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${postCount} post(s) still use this category. Reassign or permanently delete them first.`,
        count: postCount,
      });
    }

    await category.destroy();
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("ADMIN DELETE BLOG CATEGORY ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── ADMIN: AUTHORS ───────────────────────── */

exports.adminGetAuthors = async (req, res) => {
  try {
    const authors = await BlogAuthor.findAll({ order: [["name", "ASC"]] });
    res.json(authors);
  } catch (err) {
    console.error("ADMIN GET BLOG AUTHORS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreateAuthor = async (req, res) => {
  try {
    const { name, role, bio, initials, avatar_path } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Author name required" });

    const author = await BlogAuthor.create({
      name,
      role: role || null,
      bio: bio || null,
      initials: initials || name.slice(0, 2).toUpperCase(),
      avatar_path: avatar_path || null,
    });
    res.json({ success: true, author });
  } catch (err) {
    console.error("ADMIN CREATE BLOG AUTHOR ERROR:", err);
    res.status(500).json({ error: "Failed to create author" });
  }
};

exports.adminUpdateAuthor = async (req, res) => {
  try {
    const author = await BlogAuthor.findByPk(req.params.id);
    if (!author) return res.status(404).json({ error: "Author not found" });

    const { name, role, bio, initials, avatar_path } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Author name required" });

    await author.update({
      name,
      role: role ?? author.role,
      bio: bio ?? author.bio,
      initials: initials || author.initials,
      avatar_path: avatar_path !== undefined ? avatar_path : author.avatar_path,
    });
    res.json({ success: true, author });
  } catch (err) {
    console.error("ADMIN UPDATE BLOG AUTHOR ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeleteAuthor = async (req, res) => {
  try {
    const author = await BlogAuthor.findByPk(req.params.id);
    if (!author) return res.status(404).json({ error: "Author not found" });

    // paranoid:false — see adminDeleteCategory for why this must include
    // soft-deleted posts too.
    const postCount = await BlogPost.count({ where: { author_id: author.id }, paranoid: false });
    if (postCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${postCount} post(s) still use this author. Reassign or permanently delete them first.`,
        count: postCount,
      });
    }

    await author.destroy();
    res.json({ success: true, message: "Author deleted" });
  } catch (err) {
    console.error("ADMIN DELETE BLOG AUTHOR ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── ADMIN: WORDPRESS SYNC ───────────────────────── */

exports.adminSyncWordPressPosts = async (req, res) => {
  try {
    const report = await syncWordPressPosts();
    res.json({ success: true, report });
  } catch (err) {
    console.error("ADMIN SYNC WORDPRESS BLOGS ERROR:", err);
    res.status(502).json({ success: false, message: describeWpError(err) });
  }
};

/* ───────────────────────── PUBLIC: STOREFRONT ───────────────────────── */

exports.publicGetPosts = async (req, res) => {
  try {
    const { search = "", category = "", tag = "", page = 1, perPage = 9 } = req.query;
    const where = { status: "published" };
    if (search) where.title = { [Op.like]: `%${search}%` };
    if (tag) where.tags = { [Op.like]: `%"${tag}"%` };

    const include = [...POST_INCLUDES];
    if (category) {
      include[0] = { model: BlogCategory, as: "category", where: { slug: category } };
    }

    const limit = Math.max(1, Number(perPage) || 9);
    const currentPage = Math.max(1, Number(page) || 1);

    const { rows, count } = await BlogPost.findAndCountAll({
      where,
      include,
      order: [["published_at", "DESC"], ["created_at", "DESC"]],
      limit,
      offset: (currentPage - 1) * limit,
      distinct: true,
    });

    res.json({
      posts: rows.map((p) => buildBlogPostPayload(p)),
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      page: currentPage,
    });
  } catch (err) {
    console.error("PUBLIC GET BLOG POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetFeaturedPosts = async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 3);
    const posts = await BlogPost.findAll({
      where: { status: "published", is_featured: true },
      include: POST_INCLUDES,
      order: [["published_at", "DESC"]],
      limit,
    });
    res.json(posts.map((p) => buildBlogPostPayload(p)));
  } catch (err) {
    console.error("PUBLIC GET FEATURED POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      where: { slug: req.params.slug, status: "published" },
      include: POST_INCLUDES,
    });
    if (!post) return res.json(null);

    post.views = (post.views || 0) + 1;
    await post.save();

    res.json(buildBlogPostPayload(post));
  } catch (err) {
    console.error("PUBLIC GET POST BY SLUG ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetRelatedPosts = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ where: { slug: req.params.slug, status: "published" } });
    if (!post) return res.json([]);

    const limit = Math.max(1, Number(req.query.limit) || 3);
    const related = await BlogPost.findAll({
      where: { status: "published", id: { [Op.ne]: post.id }, category_id: post.category_id },
      include: POST_INCLUDES,
      order: [["published_at", "DESC"]],
      limit,
    });
    res.json(related.map((p) => buildBlogPostPayload(p)));
  } catch (err) {
    console.error("PUBLIC GET RELATED POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.findAll({ order: [["sort_order", "ASC"], ["name", "ASC"]] });
    const counts = await BlogPost.findAll({
      attributes: ["category_id", [BlogPost.sequelize.fn("COUNT", BlogPost.sequelize.col("id")), "count"]],
      where: { status: "published", category_id: { [Op.ne]: null } },
      group: ["category_id"],
      raw: true,
    });
    const countMap = new Map(counts.map((c) => [c.category_id, Number(c.count)]));

    res.json(
      categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description || "",
        icon: cat.icon || "Flame",
        tone: cat.tone || "",
        count: countMap.get(cat.id) || 0,
      }))
    );
  } catch (err) {
    console.error("PUBLIC GET BLOG CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetTags = async (req, res) => {
  try {
    const posts = await BlogPost.findAll({ where: { status: "published" }, attributes: ["tags"] });
    const tagSet = new Set();
    posts.forEach((p) => {
      const tags = Array.isArray(p.tags) ? p.tags : JSON.parse(p.tags || "[]");
      tags.forEach((t) => tagSet.add(t));
    });
    res.json([...tagSet].sort());
  } catch (err) {
    console.error("PUBLIC GET BLOG TAGS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.publicGetRecentPosts = async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 5);
    const posts = await BlogPost.findAll({
      where: { status: "published" },
      include: POST_INCLUDES,
      order: [["published_at", "DESC"]],
      limit,
    });
    res.json(posts.map((p) => buildBlogPostPayload(p)));
  } catch (err) {
    console.error("PUBLIC GET RECENT POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
