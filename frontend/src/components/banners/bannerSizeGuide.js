import { PLACEMENTS } from "./bannerConstants";

// Mirrors admin/backend/middleware/mediaUpload.js's real upload ceiling —
// the frontend can't import server config directly, so these are kept in
// sync by hand. If MAX_UPLOAD_MB/MAX_WIDTH ever change server-side, update
// here too.
export const SERVER_MAX_UPLOAD_MB = 5;
export const SERVER_MAX_UPLOAD_WIDTH = 1600;

function ratioLabel(w, h) {
  const divisor = (a, b) => (b === 0 ? a : divisor(b, a % b));
  const d = divisor(w, h);
  return `${w / d}:${h / d}`;
}

function spec({ desktop, mobile = null, appearsOn, tips }) {
  return {
    desktop,
    mobile,
    aspectRatioValue: desktop.w / desktop.h,
    aspectRatioLabel: ratioLabel(desktop.w, desktop.h),
    maxFileSizeMB: SERVER_MAX_UPLOAD_MB,
    formats: ["JPG", "PNG", "WebP"],
    appearsOn,
    tips,
  };
}

// Grounded in the actual storefront rendering (frontend/src/pages/Home.jsx):
// home_hero is full-bleed (min-h 440/540px, separate mobile <picture> source
// below 1024px), home_promo sits inside a 1280px max-w-7xl container. The
// remaining placements aren't rendered anywhere on the storefront yet
// (bannerConstants.js marks them live:false) — their specs are sensible
// e-commerce-standard defaults, not measured, and the UI must say so.
const SPECS = {
  home_hero: spec({
    desktop: { w: 1920, h: 600 },
    mobile: { w: 800, h: 900 },
    appearsOn: "Homepage — top hero slider (full width of the screen)",
    tips: [
      "Full-bleed image — busy screen edges get cropped on very wide or very narrow monitors, keep the message centered.",
      "A separate mobile image is strongly recommended: the mobile crop is much taller/narrower than desktop.",
    ],
  }),
  home_promo: spec({
    desktop: { w: 1280, h: 400 },
    appearsOn: "Homepage — offer strip below the hero section",
    tips: ["Sits inside a rounded card with text overlaid on the left — keep the right two-thirds visually clear."],
  }),
  category_banner: spec({
    desktop: { w: 1200, h: 400 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Standard landscape banner size — reserved for a future category page header."],
  }),
  offer_banner: spec({
    desktop: { w: 1200, h: 400 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Standard landscape banner size — reserved for a future promotional placement."],
  }),
  festival_banner: spec({
    desktop: { w: 1600, h: 500 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Wide seasonal-campaign size — reserved, not rendered anywhere yet."],
  }),
  blog_banner: spec({
    desktop: { w: 1200, h: 630 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Matches common social-share/article-header proportions — reserved for a future blog placement."],
  }),
  product_banner: spec({
    desktop: { w: 1200, h: 400 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Reserved for a future product-page placement."],
  }),
  collection_banner: spec({
    desktop: { w: 1600, h: 500 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Reserved for a future collection/shop-page header."],
  }),
  footer_banner: spec({
    desktop: { w: 1200, h: 300 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Short, wide strip — reserved for a future footer placement."],
  }),
  popup_banner: spec({
    desktop: { w: 600, h: 750 },
    appearsOn: "Not yet displayed on the storefront",
    tips: ["Portrait orientation for a centered modal/popup — reserved, not rendered anywhere yet."],
  }),
};

// One entry per PLACEMENTS key, guide spec merged in — PLACEMENTS stays the
// single source of truth for the key/label/live list.
export const BANNER_SIZE_GUIDE = PLACEMENTS.map((p) => ({
  key: p.key,
  label: p.label,
  live: p.live,
  ...SPECS[p.key],
}));

export function sizeGuideFor(placementKey) {
  return BANNER_SIZE_GUIDE.find((g) => g.key === placementKey) || null;
}
