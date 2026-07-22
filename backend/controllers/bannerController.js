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
    // Additive keys (v2) — existing storefront code ignores them safely.
    mobileImage: data.mobile_image_path ? toRelativeUploadPath(data.mobile_image_path) : null,
    description: data.description || "",
    device: data.device || "all",
    newTab: !!data.open_new_tab,
  };
}

const BANNER_DEVICES = ["all", "desktop", "mobile"];

// Whitelisted writable fields shared by create/update so req.body can never
// touch counters, timestamps, or id.
function pickBannerFields(body) {
  const out = {};
  if (body.eyebrow !== undefined) out.eyebrow = body.eyebrow || null;
  if (body.title !== undefined) out.title = body.title && body.title.trim() ? body.title.trim() : null;
  if (body.subtitle !== undefined) out.subtitle = body.subtitle || null;
  if (body.description !== undefined) out.description = body.description || null;
  if (body.cta_label !== undefined) out.cta_label = body.cta_label || null;
  if (body.cta_url !== undefined) out.cta_url = body.cta_url || null;
  if (body.tone !== undefined) out.tone = body.tone || null;
  if (body.image_path !== undefined) out.image_path = body.image_path || null;
  if (body.mobile_image_path !== undefined) out.mobile_image_path = body.mobile_image_path || null;
  if (body.device !== undefined) out.device = BANNER_DEVICES.includes(body.device) ? body.device : "all";
  if (body.open_new_tab !== undefined) out.open_new_tab = !!body.open_new_tab;
  if (body.starts_at !== undefined) out.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) out.ends_at = body.ends_at || null;
  if (body.sort_order !== undefined) out.sort_order = Number(body.sort_order) || 0;
  if (body.is_active !== undefined) out.is_active = !!body.is_active;
  return out;
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
    if (!body.placement) {
      return res.status(400).json({ error: "Placement is required" });
    }

    const fields = pickBannerFields(body);
    const banner = await Banner.create({
      placement: body.placement,
      ...fields,
      sort_order: fields.sort_order || 0,
      is_active: fields.is_active !== undefined ? fields.is_active : true,
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
    const fields = pickBannerFields(body);
    if (body.placement && typeof body.placement === "string") fields.placement = body.placement;
    await banner.update(fields);
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

// POST /api/admin/banners/:id/duplicate — copy everything except counters,
// created as an inactive draft at the end of its placement's ordering.
exports.adminDuplicateBanner = async (req, res) => {
  try {
    const source = await Banner.findByPk(req.params.id);
    if (!source) return res.status(404).json({ error: "Banner not found" });

    const data = source.toJSON();
    const maxSort = await Banner.max("sort_order", { where: { placement: data.placement } });
    const copy = await Banner.create({
      placement: data.placement,
      eyebrow: data.eyebrow,
      title: data.title ? `${data.title} (Copy)` : null,
      subtitle: data.subtitle,
      description: data.description,
      cta_label: data.cta_label,
      cta_url: data.cta_url,
      tone: data.tone,
      image_path: data.image_path,
      mobile_image_path: data.mobile_image_path,
      device: data.device,
      open_new_tab: data.open_new_tab,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      sort_order: (Number(maxSort) || 0) + 1,
      is_active: false,
    });
    res.json({ success: true, banner: copy });
  } catch (err) {
    console.error("ADMIN DUPLICATE BANNER ERROR:", err);
    res.status(500).json({ error: "Failed to duplicate banner" });
  }
};

// POST /api/admin/banners/bulk — { ids: [], action: "activate" | "deactivate" | "delete" }
exports.adminBulkBannerAction = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    const action = req.body.action;
    if (ids.length === 0) return res.status(400).json({ error: "No banners selected" });

    if (action === "delete") {
      await Banner.destroy({ where: { id: { [Op.in]: ids } } });
    } else if (action === "activate" || action === "deactivate") {
      await Banner.update({ is_active: action === "activate" }, { where: { id: { [Op.in]: ids } } });
    } else {
      return res.status(400).json({ error: "Unknown bulk action" });
    }
    res.json({ success: true, affected: ids.length });
  } catch (err) {
    console.error("ADMIN BULK BANNER ERROR:", err);
    res.status(500).json({ error: "Bulk action failed" });
  }
};

// PUT /api/admin/banners/reorder — { ids: [...] } in the desired display order.
// One update per id keeps it simple; banner lists are small (tens, not thousands).
exports.adminReorderBanners = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ error: "No order provided" });

    await Promise.all(ids.map((id, index) => Banner.update({ sort_order: index }, { where: { id } })));
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN REORDER BANNERS ERROR:", err);
    res.status(500).json({ error: "Reorder failed" });
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
    // Optional device targeting: ?device=mobile returns mobile + all banners.
    // No param keeps the pre-v2 behavior (everything), so old clients are safe.
    if (req.query.device && ["desktop", "mobile"].includes(req.query.device)) {
      where.device = { [Op.in]: ["all", req.query.device] };
    }

    const banners = await Banner.findAll({ where, order: [["sort_order", "ASC"], ["id", "ASC"]] });
    res.json(banners.map(buildPublicBanner));
  } catch (err) {
    console.error("PUBLIC GET BANNERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/store/banners/track — { ids: [1,2], type: "view" | "click" }
// Fire-and-forget analytics from the storefront; atomic increment, no auth,
// always 204 so a tracking hiccup can never surface as a storefront error.
exports.publicTrackBanner = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 50) : [];
    const column = req.body.type === "click" ? "click_count" : "view_count";
    if (ids.length > 0) {
      await Banner.increment(column, { by: 1, where: { id: { [Op.in]: ids } } });
    }
  } catch (err) {
    console.error("PUBLIC TRACK BANNER ERROR:", err);
  }
  res.status(204).end();
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
