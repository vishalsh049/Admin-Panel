const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");
const BlogCategory = require("../models/BlogCategory");
const { buildPublicItem, buildAdminItem } = require("../utils/serializers/menuSerializer");

// Factory, not a shared constant — Sequelize mutates include objects while
// building the query, so reusing one array for both the parent and the
// nested `children` include produces duplicate JOIN aliases
// ("Not unique table/alias: 'children->categoryRef'").
const refIncludes = () => [
  { model: Category, as: "categoryRef", attributes: ["id", "name"] },
  { model: BlogCategory, as: "blogCategoryRef", attributes: ["id", "slug"] },
];

/* ───────────────────────── ADMIN ───────────────────────── */

// GET /api/admin/menu-items?location=header
exports.adminGetItems = async (req, res) => {
  try {
    const where = {};
    if (req.query.location) where.location = req.query.location;

    const items = await MenuItem.findAll({
      where,
      include: refIncludes(),
      order: [["sort_order", "ASC"], ["id", "ASC"]],
    });
    res.json(items.map(buildAdminItem));
  } catch (err) {
    console.error("ADMIN GET MENU ITEMS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.adminCreateItem = async (req, res) => {
  try {
    const { location, parent_id, label, link_type, url, category_id, blog_category_id, sort_order, is_active } = req.body;
    if (!location || !label || !label.trim()) {
      return res.status(400).json({ error: "Location and label are required" });
    }

    const item = await MenuItem.create({
      location,
      parent_id: parent_id || null,
      label,
      link_type: link_type || "custom_url",
      url: url || null,
      category_id: category_id || null,
      blog_category_id: blog_category_id || null,
      sort_order: Number(sort_order) || 0,
      is_active: is_active !== undefined ? !!is_active : true,
    });

    const full = await MenuItem.findByPk(item.id, { include: refIncludes() });
    res.json({ success: true, item: buildAdminItem(full) });
  } catch (err) {
    console.error("ADMIN CREATE MENU ITEM ERROR:", err);
    res.status(500).json({ error: "Failed to create menu item" });
  }
};

exports.adminUpdateItem = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: "Menu item not found" });

    const { label, link_type, url, category_id, blog_category_id, parent_id, sort_order, is_active } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: "Label is required" });

    if (parent_id && Number(parent_id) === Number(item.id)) {
      return res.status(400).json({ error: "A menu item cannot be its own parent" });
    }

    await item.update({
      label,
      link_type: link_type || item.link_type,
      url: url !== undefined ? url : item.url,
      category_id: category_id !== undefined ? category_id || null : item.category_id,
      blog_category_id: blog_category_id !== undefined ? blog_category_id || null : item.blog_category_id,
      parent_id: parent_id !== undefined ? parent_id || null : item.parent_id,
      sort_order: sort_order !== undefined ? Number(sort_order) || 0 : item.sort_order,
      is_active: is_active !== undefined ? !!is_active : item.is_active,
    });

    const full = await MenuItem.findByPk(item.id, { include: refIncludes() });
    res.json({ success: true, item: buildAdminItem(full) });
  } catch (err) {
    console.error("ADMIN UPDATE MENU ITEM ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.adminDeleteItem = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: "Menu item not found" });

    const childCount = await MenuItem.count({ where: { parent_id: item.id } });
    if (childCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${childCount} submenu item(s) still reference this item. Delete them first.`,
        count: childCount,
      });
    }

    await item.destroy();
    res.json({ success: true, message: "Menu item deleted" });
  } catch (err) {
    console.error("ADMIN DELETE MENU ITEM ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

// POST /api/admin/menu-items/seed-from-categories { location }
// Bulk-populates a menu location with every Active, top-level category that
// doesn't already have a menu item linked to it — dedup by category_id, so
// it's safe to run repeatedly (won't create duplicates) as new categories
// are added. Existing items (custom links, renamed labels, reordering) are
// left untouched.
exports.adminSeedFromCategories = async (req, res) => {
  try {
    const location = req.body.location || "header";

    const [categories, existingItems] = await Promise.all([
      Category.findAll({
        where: { status: "Active", parent_id: null },
        order: [["sort_order", "ASC"], ["name", "ASC"]],
      }),
      MenuItem.findAll({ where: { location, link_type: "category" }, attributes: ["category_id"] }),
    ]);

    const alreadyLinked = new Set(existingItems.map((i) => i.category_id));
    const toCreate = categories.filter((c) => !alreadyLinked.has(c.id));

    const maxSortOrder = await MenuItem.max("sort_order", { where: { location, parent_id: null } });
    let nextSortOrder = (Number(maxSortOrder) || 0) + 1;

    const created = [];
    for (const category of toCreate) {
      const item = await MenuItem.create({
        location,
        label: category.name,
        link_type: "category",
        category_id: category.id,
        sort_order: nextSortOrder,
        is_active: true,
      });
      created.push(item.id);
      nextSortOrder += 1;
    }

    res.json({
      success: true,
      created: created.length,
      skipped: categories.length - created.length,
      total: categories.length,
    });
  } catch (err) {
    console.error("ADMIN SEED MENU FROM CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Failed to populate menu from categories" });
  }
};

/* ───────────────────────── PUBLIC ───────────────────────── */

// GET /api/store/menu/:location — returns a nested tree of active items.
exports.publicGetMenu = async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: { location: req.params.location, parent_id: null, is_active: true },
      include: [...refIncludes(), { model: MenuItem, as: "children", include: refIncludes() }],
      order: [["sort_order", "ASC"], ["id", "ASC"]],
    });
    res.json(items.map(buildPublicItem));
  } catch (err) {
    console.error("PUBLIC GET MENU ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
