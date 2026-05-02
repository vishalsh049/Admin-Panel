const express = require("express");
const router = express.Router();
const ExpenseCategory = require("../models/ExpenseCategory");

/* GET ALL */
router.get("/", async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ADD */
router.post("/", async (req, res) => {
  try {
    const category = await ExpenseCategory.create(req.body);
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ExpenseCategory.destroy({
      where: { id }
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;