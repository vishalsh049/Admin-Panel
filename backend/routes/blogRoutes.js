const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const {
  adminGetPosts,
  adminGetPost,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetAuthors,
  adminCreateAuthor,
  adminUpdateAuthor,
  adminDeleteAuthor,
} = require("../controllers/blogController");

router.use(adminAuth, requirePermission("blog"));

router.get("/posts", adminGetPosts);
router.get("/posts/:id", adminGetPost);
router.post("/posts", adminCreatePost);
router.put("/posts/:id", adminUpdatePost);
router.delete("/posts/:id", adminDeletePost);

router.get("/categories", adminGetCategories);
router.post("/categories", adminCreateCategory);
router.put("/categories/:id", adminUpdateCategory);
router.delete("/categories/:id", adminDeleteCategory);

router.get("/authors", adminGetAuthors);
router.post("/authors", adminCreateAuthor);
router.put("/authors/:id", adminUpdateAuthor);
router.delete("/authors/:id", adminDeleteAuthor);

module.exports = router;
