const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const MediaAsset = require("../models/MediaAsset");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");
const mediaUpload = require("../middleware/mediaUpload");

function safeUnlink(relativePath) {
  if (!relativePath) return;
  try {
    const normalized = toRelativeUploadPath(relativePath);
    if (!normalized.startsWith("/uploads/")) return;
    const absolute = path.join(__dirname, "..", normalized);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (error) {
    console.warn("Failed to remove upload file:", relativePath, error.message);
  }
}

// GET /api/admin/media?search=&page=&limit=
exports.listMedia = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { original_name: { [Op.like]: `%${req.query.search}%` } },
        { title: { [Op.like]: `%${req.query.search}%` } },
        { alt_text: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await MediaAsset.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ assets: rows, total: count, page, totalPages: Math.max(1, Math.ceil(count / limit)) });
  } catch (err) {
    console.error("LIST MEDIA ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/admin/media/upload (multipart, field "file")
exports.uploadMedia = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const asset = await MediaAsset.create({
      file_name: req.file.filename,
      original_name: req.file.originalname,
      path: mediaUpload.relativePath(req.file.filename),
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      width: req.fileDimensions?.width || null,
      height: req.fileDimensions?.height || null,
      alt_text: req.body.alt_text || null,
      title: req.body.title || null,
      folder: req.body.folder || null,
      uploaded_by_user_id: req.adminId || null,
    });
    res.json({ success: true, asset });
  } catch (err) {
    console.error("UPLOAD MEDIA ERROR:", err);
    res.status(500).json({ error: "Failed to save media asset" });
  }
};

// PUT /api/admin/media/:id (alt_text/title only)
exports.updateMediaMeta = async (req, res) => {
  try {
    const asset = await MediaAsset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: "Media asset not found" });

    await asset.update({
      alt_text: req.body.alt_text !== undefined ? req.body.alt_text : asset.alt_text,
      title: req.body.title !== undefined ? req.body.title : asset.title,
    });
    res.json({ success: true, asset });
  } catch (err) {
    console.error("UPDATE MEDIA META ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

// DELETE /api/admin/media/:id (soft delete + remove file from disk)
exports.deleteMedia = async (req, res) => {
  try {
    const asset = await MediaAsset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: "Media asset not found" });

    safeUnlink(asset.path);
    await asset.destroy();
    res.json({ success: true, message: "Media asset deleted" });
  } catch (err) {
    console.error("DELETE MEDIA ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};
