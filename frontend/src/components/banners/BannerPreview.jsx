import { Sparkles, ArrowRight } from "lucide-react";
import { getImageUrl } from "../../utils/getImageUrl";

// Faithful miniature of how the storefront renders a banner (gradient tone,
// optional image with dark scrim, eyebrow/title/subtitle, gold CTA pill).
// Used inside the editor's live-preview pane and the standalone preview modal.
export default function BannerPreview({ banner, device = "desktop", className = "" }) {
  const isMobile = device === "mobile";
  const image = isMobile && banner.mobile_image_path ? banner.mobile_image_path : banner.image_path;

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-br ${banner.tone || "from-red-950 via-red-900 to-orange-800"} ${className}`}
    >
      {image && (
        <>
          <img
            src={getImageUrl(image)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-950/60 to-red-950/20" />
        </>
      )}

      <div className={`relative flex h-full flex-col justify-center ${isMobile ? "px-5 py-8" : "px-8 py-10"}`}>
        {banner.eyebrow && (
          <p className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-sm">
            <Sparkles size={11} /> {banner.eyebrow}
          </p>
        )}
        <h3 className={`max-w-xl font-semibold leading-snug text-amber-50 ${isMobile ? "text-lg" : "text-2xl"}`}>
          {banner.title || "Banner title"}
        </h3>
        {banner.subtitle && (
          <p className={`mt-2 max-w-md text-amber-100/90 ${isMobile ? "text-xs" : "text-sm"}`}>{banner.subtitle}</p>
        )}
        {banner.cta_label && (
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-2 text-xs font-bold text-red-950 shadow-lg shadow-amber-950/30">
            {banner.cta_label} <ArrowRight size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
