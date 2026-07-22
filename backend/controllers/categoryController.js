const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const Category = require("../models/Category");
const Product = require("../models/Products");
const slugify = require("../utils/slugify");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");
const categoryUpload = require("../middleware/categoryUpload");
const { PLACEHOLDER_IMAGE_PATH } = require("../utils/constants");

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

async function generateUniqueSlug(name, excludeId = null) {
  const base = slugify(name) || `category-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (
    await Category.findOne({
      where: excludeId ? { slug: candidate, id: { [Op.ne]: excludeId } } : { slug: candidate },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// GET all categories (admin: includes Inactive; supports search + pagination)
exports.getCategories = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) where.name = { [Op.like]: `%${req.query.search}%` };

    const categories = await Category.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const counts = await Product.findAll({
      attributes: ["category_id", [Product.sequelize.fn("COUNT", Product.sequelize.col("id")), "count"]],
      where: { category_id: { [Op.ne]: null }, status: "publish" },
      group: ["category_id"],
      raw: true,
    });
    const countMap = new Map(counts.map((c) => [c.category_id, Number(c.count)]));

    const withCounts = categories.map((cat) => {
      const json = cat.toJSON();
      json.productCount = countMap.get(cat.id) || 0;
      json.image = json.image || PLACEHOLDER_IMAGE_PATH;
      return json;
    });

    res.json(withCounts);
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ADD category
exports.addCategory = async (req, res) => {
  try {
    let { name, slug, description, parent_id, status, image, banner, icon,
      seo_title, seo_description, seo_keywords, sort_order, is_featured } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name required" });
    }

    const existing = await Category.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const finalSlug = await generateUniqueSlug(slug && slug.trim() ? slug : name);

    const category = await Category.create({
      name,
      slug: finalSlug,
      description: description || null,
      parent_id: parent_id || null,
      status: status === "Inactive" ? "Inactive" : "Active",
      image: image ? toRelativeUploadPath(image) : null,
      banner: banner ? toRelativeUploadPath(banner) : null,
      icon: icon ? toRelativeUploadPath(icon) : null,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      seo_keywords: seo_keywords || null,
      sort_order: Number(sort_order) || 0,
      is_featured: !!is_featured,
    });

    res.json(category);
  } catch (err) {
    console.error("ADD CATEGORY ERROR:", err);
    res.status(500).json({ error: "Failed to add category" });
  }
};

// UPDATE category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, slug, description, parent_id, status, image, banner, icon,
      seo_title, seo_description, seo_keywords, sort_order, is_featured } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name required" });
    }

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    const nameCollision = await Category.findOne({
      where: { name, id: { [Op.ne]: id } },
    });
    if (nameCollision) {
      return res.status(400).json({ error: "Another category already uses this name" });
    }

    if (parent_id && Number(parent_id) === Number(id)) {
      return res.status(400).json({ error: "A category cannot be its own parent" });
    }

    if (parent_id) {
      let ancestorId = Number(parent_id);
      const visited = new Set([Number(id)]);
      while (ancestorId) {
        if (visited.has(ancestorId)) {
          return res.status(400).json({ error: "This parent would create a category loop" });
        }
        visited.add(ancestorId);
        const ancestor = await Category.findByPk(ancestorId, { attributes: ["parent_id"] });
        ancestorId = ancestor?.parent_id ? Number(ancestor.parent_id) : null;
      }
    }

    const finalSlug =
      slug && slug.trim() && slug.trim() !== category.slug
        ? await generateUniqueSlug(slug, id)
        : category.slug;

    if (image && category.image && image !== category.image) safeUnlink(category.image);
    if (banner && category.banner && banner !== category.banner) safeUnlink(category.banner);
    if (icon && category.icon && icon !== category.icon) safeUnlink(category.icon);

    await category.update({
      name,
      slug: finalSlug,
      description: description || null,
      parent_id: parent_id || null,
      status: status === "Inactive" ? "Inactive" : "Active",
      image: image !== undefined ? (image ? toRelativeUploadPath(image) : null) : category.image,
      banner: banner !== undefined ? (banner ? toRelativeUploadPath(banner) : null) : category.banner,
      icon: icon !== undefined ? (icon ? toRelativeUploadPath(icon) : null) : category.icon,
      seo_title: seo_title ?? category.seo_title,
      seo_description: seo_description ?? category.seo_description,
      seo_keywords: seo_keywords ?? category.seo_keywords,
      sort_order: sort_order !== undefined ? Number(sort_order) || 0 : category.sort_order,
      is_featured: is_featured !== undefined ? !!is_featured : category.is_featured,
    });

    res.json({ success: true, category });
  } catch (err) {
    console.error("UPDATE CATEGORY ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

// SOFT DELETE category (paranoid model — blocked if products still reference it)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    const productCount = await Product.count({ where: { category_id: id } });
    if (productCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${productCount} product(s) still use this category. Reassign them first.`,
        count: productCount,
      });
    }

    const childCount = await Category.count({ where: { parent_id: id } });
    if (childCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${childCount} subcategory(ies) still reference this category.`,
        count: childCount,
      });
    }

    await category.destroy();

    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

exports.bulkDeleteCategories = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ error: "No category ids provided" });

    const blocked = await Product.findAll({
      attributes: ["category_id"],
      where: { category_id: { [Op.in]: ids } },
      group: ["category_id"],
      raw: true,
    });
    if (blocked.length > 0) {
      return res.status(409).json({
        error: "Some categories still have products assigned and cannot be deleted.",
        blockedCategoryIds: blocked.map((b) => b.category_id),
      });
    }

    const deleted = await Category.destroy({ where: { id: { [Op.in]: ids } } });
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("BULK DELETE CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
};

exports.uploadCategoryImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  return res.json({ success: true, path: categoryUpload.relativePath(req.file.filename) });
};
