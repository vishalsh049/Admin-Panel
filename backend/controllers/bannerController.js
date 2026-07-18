const { Op } = require("sequelize");
const Banner = require("../models/Banner");
const Testimonial = require("../models/Testimonial");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");

// Shapes a banner into the exact keys Home.jsx's hero slider already uses
// (eyebrow/title/sub/cta/path/tone) so the storefront needs minimal changes.
function buildPublicBanner(banner) {
  const data = banner.toJSON ? banner.toJSON() : banner;
  return {
    id: data.id,
    eyebrow: data.eyebrow || "",
    title: data.title,
    sub: data.subtitle || "",
    cta: data.cta_label || "",
    path: data.cta_url || "#",
    tone: data.tone || "from-red-950 via-red-900 to-orange-800",
    image: data.image_path ? toRelativeUploadPath(data.image_path) : null,
  };
}

function buildPublicTestimonial(t) {
  const data = t.toJSON ? t.toJSON() : t;
  return {
    id: data.id,
    name: data.name,
    location: data.location || "",
    text: data.text,
    rating: data.rating || 5,
  };
}

/* ───────────────────────── ADMIN: BANNERS ───────────────────────── */

exports.adminGetBanners = async (req, res) => {
  try {
    const where = {};
    if (req.query.placement) where.placement = req.query.placement;
    const banners = await Banner.findAll({ where, order: [["sort_order", "ASC"], ["id", "ASC"]] });
    res.json(banners);
  } catch (err) {
    console.error("ADMIN GET BANNERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreateBanner = async (req, res) => {
  try {
    const body = req.body;
    if (!body.placement || !body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Placement and title are required" });
    }

    const banner = await Banner.create({
      placement: body.placement,
      eyebrow: body.eyebrow || null,
      title: body.title,
      subtitle: body.subtitle || null,
      cta_label: body.cta_label || null,
      cta_url: body.cta_url || null,
      tone: body.tone || null,
      image_path: body.image_path || null,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      sort_order: Number(body.sort_order) || 0,
      is_active: body.is_active !== undefined ? !!body.is_active : true,
    });
    res.json({ success: true, banner });
  } catch (err) {
    console.error("ADMIN CREATE BANNER ERROR:", err);
    res.status(500).json({ error: "Failed to create banner" });
  }
};

exports.adminUpdateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });

    const body = req.body;
    if (!body.title || !body.title.trim()) return res.status(400).json({ error: "Title is required" });

    await banner.update({
      eyebrow: body.eyebrow !== undefined ? body.eyebrow : banner.eyebrow,
      title: body.title,
      subtitle: body.subtitle !== undefined ? body.subtitle : banner.subtitle,
      cta_label: body.cta_label !== undefined ? body.cta_label : banner.cta_label,
      cta_url: body.cta_url !== undefined ? body.cta_url : banner.cta_url,
      tone: body.tone !== undefined ? body.tone : banner.tone,
      image_path: body.image_path !== undefined ? body.image_path : banner.image_path,
      starts_at: body.starts_at !== undefined ? body.starts_at || null : banner.starts_at,
      ends_at: body.ends_at !== undefined ? body.ends_at || null : banner.ends_at,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) || 0 : banner.sort_order,
      is_active: body.is_active !== undefined ? !!body.is_active : banner.is_active,
    });
    res.json({ success: true, banner });
  } catch (err) {
    console.error("ADMIN UPDATE BANNER ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });
    await banner.destroy();
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    console.error("ADMIN DELETE BANNER ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── ADMIN: TESTIMONIALS ───────────────────────── */

exports.adminGetTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({ order: [["sort_order", "ASC"], ["id", "ASC"]] });
    res.json(testimonials);
  } catch (err) {
    console.error("ADMIN GET TESTIMONIALS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreateTestimonial = async (req, res) => {
  try {
    const { name, location, text, rating, sort_order, is_active } = req.body;
    if (!name || !name.trim() || !text || !text.trim()) {
      return res.status(400).json({ error: "Name and text are required" });
    }

    const testimonial = await Testimonial.create({
      name,
      location: location || null,
      text,
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      sort_order: Number(sort_order) || 0,
      is_active: is_active !== undefined ? !!is_active : true,
    });
    res.json({ success: true, testimonial });
  } catch (err) {
    console.error("ADMIN CREATE TESTIMONIAL ERROR:", err);
    res.status(500).json({ error: "Failed to create testimonial" });
  }
};

exports.adminUpdateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ error: "Testimonial not found" });

    const { name, location, text, rating, sort_order, is_active } = req.body;
    if (!name || !name.trim() || !text || !text.trim()) {
      return res.status(400).json({ error: "Name and text are required" });
    }

    await testimonial.update({
      name,
      location: location !== undefined ? location : testimonial.location,
      text,
      rating: rating !== undefined ? Math.min(5, Math.max(1, Number(rating) || 5)) : testimonial.rating,
      sort_order: sort_order !== undefined ? Number(sort_order) || 0 : testimonial.sort_order,
      is_active: is_active !== undefined ? !!is_active : testimonial.is_active,
    });
    res.json({ success: true, testimonial });
  } catch (err) {
    console.error("ADMIN UPDATE TESTIMONIAL ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ error: "Testimonial not found" });
    await testimonial.destroy();
    res.json({ success: true, message: "Testimonial deleted" });
  } catch (err) {
    console.error("ADMIN DELETE TESTIMONIAL ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ───────────────────────── PUBLIC ───────────────────────── */

// GET /api/store/banners?placement=home_hero — active, within schedule window.
exports.publicGetBanners = async (req, res) => {
  try {
    const now = new Date();
    const where = {
      is_active: true,
      [Op.and]: [
        { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }] },
        { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gte]: now } }] },
      ],
    };
    if (req.query.placement) where.placement = req.query.placement;

    const banners = await Banner.findAll({ where, order: [["sort_order", "ASC"], ["id", "ASC"]] });
    res.json(banners.map(buildPublicBanner));
  } catch (err) {
    console.error("PUBLIC GET BANNERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/store/testimonials
exports.publicGetTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({
      where: { is_active: true },
      order: [["sort_order", "ASC"], ["id", "ASC"]],
    });
    res.json(testimonials.map(buildPublicTestimonial));
  } catch (err) {
    console.error("PUBLIC GET TESTIMONIALS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
