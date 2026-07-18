const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const {
  adminGetBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminGetTestimonials,
  adminCreateTestimonial,
  adminUpdateTestimonial,
  adminDeleteTestimonial,
} = require("../controllers/bannerController");

router.use(adminAuth);

const banners = requirePermission("banners");
const testimonials = requirePermission("testimonials");

router.get("/testimonials/all", testimonials, adminGetTestimonials);
router.post("/testimonials", testimonials, adminCreateTestimonial);
router.put("/testimonials/:id", testimonials, adminUpdateTestimonial);
router.delete("/testimonials/:id", testimonials, adminDeleteTestimonial);

router.get("/", banners, adminGetBanners);
router.post("/", banners, adminCreateBanner);
router.put("/:id", banners, adminUpdateBanner);
router.delete("/:id", banners, adminDeleteBanner);

module.exports = router;
