const express = require("express");
const router = express.Router();
const { publicGetBanners, publicGetTestimonials, publicTrackBanner } = require("../controllers/bannerController");

// Public, unauthenticated. Mounted at /api/store in server.js under
// /banners and /testimonials.
router.get("/banners", publicGetBanners);
router.post("/banners/track", publicTrackBanner);
router.get("/testimonials", publicGetTestimonials);

module.exports = router;
