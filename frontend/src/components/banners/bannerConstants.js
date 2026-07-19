// Shared vocabulary for the Banner Management module. `placement` is a free
// string in the DB, so adding entries here needs no schema change — but only
// the ones marked `live` are currently rendered by the storefront.
export const PLACEMENTS = [
  { key: "home_hero", label: "Homepage Hero", live: true },
  { key: "home_promo", label: "Homepage Offer", live: true },
  { key: "category_banner", label: "Category Banner", live: false },
  { key: "offer_banner", label: "Offer Banner", live: false },
  { key: "festival_banner", label: "Festival Banner", live: false },
  { key: "blog_banner", label: "Blog Banner", live: false },
  { key: "product_banner", label: "Product Banner", live: false },
  { key: "collection_banner", label: "Collection Banner", live: false },
  { key: "footer_banner", label: "Footer Banner", live: false },
  { key: "popup_banner", label: "Popup Banner", live: false },
];

export const DEVICES = [
  { key: "all", label: "All devices" },
  { key: "desktop", label: "Desktop only" },
  { key: "mobile", label: "Mobile only" },
];

export const TONES = [
  "from-red-950 via-red-900 to-orange-800",
  "from-orange-900 via-red-900 to-rose-950",
  "from-rose-950 via-orange-900 to-amber-800",
  "from-orange-700 via-red-800 to-red-950",
  "from-amber-600 to-orange-800",
  "from-amber-500 via-yellow-600 to-amber-700",
  "from-emerald-900 via-teal-900 to-emerald-950",
  "from-indigo-950 via-purple-900 to-indigo-900",
  "from-stone-900 via-stone-800 to-amber-900",
];

export function placementLabel(key) {
  return PLACEMENTS.find((p) => p.key === key)?.label || key;
}

// Effective lifecycle status combining the visibility flag with the schedule
// window — mirrors exactly how publicGetBanners decides what the storefront sees.
export function bannerStatus(banner, now = new Date()) {
  if (!banner.is_active) return "inactive";
  if (banner.starts_at && new Date(banner.starts_at) > now) return "scheduled";
  if (banner.ends_at && new Date(banner.ends_at) < now) return "expired";
  return "live";
}

export const STATUS_META = {
  live: { label: "Live", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  expired: { label: "Expired", className: "bg-rose-50 text-rose-600 ring-rose-200" },
  inactive: { label: "Hidden", className: "bg-stone-100 text-stone-500 ring-stone-200" },
};
