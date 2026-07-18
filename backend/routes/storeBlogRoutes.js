const express = require("express");
const router = express.Router();
const {
  publicGetPosts,
  publicGetFeaturedPosts,
  publicGetPostBySlug,
  publicGetRelatedPosts,
  publicGetCategories,
  publicGetTags,
  publicGetRecentPosts,
} = require("../controllers/blogController");

// All public/unauthenticated — mirrors the shape frontend/src/services/blogService.js
// (mock) already returns. Mounted at /api/store/blog in server.js.
router.get("/posts/featured", publicGetFeaturedPosts);
router.get("/posts/recent", publicGetRecentPosts);
router.get("/posts/:slug/related", publicGetRelatedPosts);
router.get("/posts/:slug", publicGetPostBySlug);
router.get("/posts", publicGetPosts);
router.get("/categories", publicGetCategories);
router.get("/tags", publicGetTags);

module.exports = router;
