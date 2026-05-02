const Category = require("../models/Category");

// GET all active categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: "Active" },
      order: [["createdAt", "DESC"]],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ADD category
exports.addCategory = async (req, res) => {
  try {
    let { name, slug, description, parent_id } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name required" });
    }

    // 🔥 AUTO GENERATE SLUG IF EMPTY
    if (!slug || slug.trim() === "") {
      slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }

    const existing = await Category.findOne({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = await Category.create({
      name,
      slug,
      description: description || null, // ✅ optional
      parent_id: parent_id || null,
    });

    res.json(category);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Failed to add category" });
  }
};

// UPDATE category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    await Category.update(
      { name },
      { where: { id } }
    );

    const updatedCategory = await Category.findByPk(id);

    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
};

// SOFT DELETE category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await Category.update(
      { status: "Inactive" },
      { where: { id } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
};