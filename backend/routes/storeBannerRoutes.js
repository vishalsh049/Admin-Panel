const express = require("express");
const router = express.Router();
const { publicGetBanners, publicGetTestimonials } = require("../controllers/bannerController");

// Public, unauthenticated. Mounted at /api/store in server.js under
// /banners and /testimonials.
router.get("/banners", publicGetBanners);
router.get("/testimonials", publicGetTestimonials);

module.exports = router;
