const SiteSetting = require("../models/SiteSetting");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");

const FIELDS = [
  "site_name",
  "logo_path",
  "favicon_path",
  "contact_email",
  "contact_phone",
  "contact_address",
  "social_facebook",
  "social_instagram",
  "social_youtube",
  "social_whatsapp",
  "announcement_bar_text",
  "extra",
];

async function getOrCreateRow() {
  const [row] = await SiteSetting.findOrCreate({ where: { id: 1 }, defaults: { id: 1 } });
  return row;
}

// GET /api/admin/site-settings and GET /api/store/site-settings (public, read-only)
exports.getSettings = async (req, res) => {
  try {
    const row = await getOrCreateRow();
    res.json(row);
  } catch (err) {
    console.error("GET SITE SETTINGS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/admin/site-settings (adminAuth)
exports.updateSettings = async (req, res) => {
  try {
    const row = await getOrCreateRow();
    const updates = {};

    for (const field of FIELDS) {
      if (req.body[field] === undefined) continue;
      updates[field] = field === "logo_path" || field === "favicon_path"
        ? (req.body[field] ? toRelativeUploadPath(req.body[field]) : null)
        : req.body[field];
    }
    updates.updated_by_user_id = req.adminId || null;

    await row.update(updates);
    res.json({ success: true, settings: row });
  } catch (err) {
    console.error("UPDATE SITE SETTINGS ERROR:", err);
    res.status(400).json({ error: "Failed to update settings" });
  }
};
