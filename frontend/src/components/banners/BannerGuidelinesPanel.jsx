import { Lightbulb, Focus, MessageSquareOff, Zap, ImageUp } from "lucide-react";

const TIPS = [
  { icon: ImageUp, text: "Use high-quality, well-lit images — upscaled or blurry photos are obvious on a large hero banner." },
  { icon: Focus, text: "Keep the important subject and any text near the center — banners get cropped differently on different screen sizes." },
  { icon: MessageSquareOff, text: "Avoid packing in too much text on the image itself — use the banner's own title/subtitle fields instead, they stay sharp on every screen." },
  { icon: Zap, text: "Prefer WebP when possible — smaller file size than JPG/PNG at the same visual quality, which means faster page loads." },
];

export default function BannerGuidelinesPanel() {
  return (
    <div className="mx-1 rounded-2xl border border-amber-100/70 bg-white/70 p-4 shadow-sm shadow-amber-900/[0.04] backdrop-blur sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Lightbulb className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-stone-900">Banner Guidelines</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TIPS.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl bg-amber-50/60 p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-stone-700">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
