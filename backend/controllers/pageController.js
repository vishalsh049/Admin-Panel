const { Op } = require("sequelize");
const Page = require("../models/Page");
const slugify = require("../utils/slugify");
const { buildPagePayload } = require("../utils/serializers/pageSerializer");

// Storefront routes that must never be shadowed by a CMS page slug.
const RESERVED_SLUGS = new Set([
  "shop", "cart", "checkout", "login", "register", "blog", "aboutus", "contactus",
  "my-account", "wishlist", "track-order", "order-history", "order-success",
  "privacy-policy", "pricing-policy", "terms-conditions", "refund-policy",
  "shipping-policy", "return-policy", "forgot-password", "reset-password",
]);

async function generateUniqueSlug(title, excludeId = null) {
  let base = slugify(title) || `page-${Date.now()}`;
  if (RESERVED_SLUGS.has(base)) base = `${base}-page`;
  let candidate = base;
  let suffix = 2;
  while (
    await Page.findOne({
      where: excludeId ? { slug: candidate, id: { [Op.ne]: excludeId } } : { slug: candidate },
      paranoid: false, // a soft-deleted page still owns its slug (DB unique index)
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/* ───────────────────────── ADMIN ───────────────────────── */

exports.adminGetPages = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) where.title = { [Op.like]: `%${req.query.search}%` };

    const pages = await Page.findAll({ where, order: [["updated_at", "DESC"]] });
    res.json(pages.map((p) => buildPagePayload(p, { context: "admin" })));
  } catch (err) {
    console.error("ADMIN GET PAGES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminGetPage = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(buildPagePayload(page, { context: "admin" }));
  } catch (err) {
    console.error("ADMIN GET PAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreatePage = async (req, res) => {
  try {
    const body = req.body;
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const slug = await generateUniqueSlug(body.slug && body.slug.trim() ? body.slug : body.title);

    const page = await Page.create({
      title: body.title,
      slug,
      blocks_json: Array.isArray(body.blocks) ? body.blocks : [],
      status: body.status === "published" ? "published" : "draft",
      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,
      seo_keywords: body.seo_keywords || null,
    });

    res.json({ success: true, page: buildPagePayload(page, { context: "admin" }) });
  } catch (err) {
    console.error("ADMIN CREATE PAGE ERROR:", err);
    res.status(500).json({ error: "Failed to create page" });
  }
};

exports.adminUpdatePage = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const body = req.body;
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const slug =
      body.slug && body.slug.trim() && body.slug.trim() !== page.slug
        ? await generateUniqueSlug(body.slug, page.id)
        : page.slug;

    await page.update({
      title: body.title,
      slug,
      blocks_json: Array.isArray(body.blocks) ? body.blocks : page.blocks_json,
      status: body.status === "published" ? "published" : "draft",
      seo_title: body.seo_title ?? page.seo_title,
      seo_description: body.seo_description ?? page.seo_description,
      seo_keywords: body.seo_keywords ?? page.seo_keywords,
    });

    res.json({ success: true, page: buildPagePayload(page, { context: "admin" }) });
  } catch (err) {
    console.error("ADMIN UPDATE PAGE ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeletePage = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    await page.destroy();
    res.json({ success: true, message: "Page deleted" });
  } catch (err) {
    console.error("ADMIN DELETE PAGE ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── PUBLIC ───────────────────────── */

// GET /api/store/pages/:slug — published pages only; null (200) when absent,
// matching the blog detail endpoint's convention so the storefront can show
// its own 404 state without treating it as a network error.
exports.publicGetPageBySlug = async (req, res) => {
  try {
    const page = await Page.findOne({ where: { slug: req.params.slug, status: "published" } });
    if (!page) return res.json(null);
    res.json(buildPagePayload(page));
  } catch (err) {
    console.error("PUBLIC GET PAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
