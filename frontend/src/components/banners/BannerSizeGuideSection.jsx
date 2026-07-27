import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, ChevronDown, Info, Monitor, Smartphone, FileImage, MapPin } from "lucide-react";
import Tooltip from "../ui/Tooltip";
import { BANNER_SIZE_GUIDE } from "./bannerSizeGuide";

const COLLAPSE_KEY = "dd_banner_sizeguide_collapsed_v1";

function SizeSwatch({ ratio }) {
  // Visual rectangle at the banner's real aspect ratio, capped to a sane
  // display height so extreme ratios (e.g. portrait popups) don't blow out
  // the card grid.
  const height = Math.max(36, Math.min(64, 64 / Math.max(ratio, 0.5)));
  return (
    <div className="flex h-16 items-center justify-center rounded-lg bg-stone-100">
      <div
        className="rounded bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner"
        style={{ width: `${Math.min(90, height * ratio)}%`, height: `${height}%`, aspectRatio: ratio }}
      />
    </div>
  );
}

function SizeCard({ guide }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        guide.live ? "border-amber-200/80 bg-white" : "border-stone-200 bg-stone-50/60 opacity-80"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-stone-900">{guide.label}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              guide.live ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"
            }`}
          >
            {guide.live ? "Live on storefront" : "Not yet live"}
          </span>
        </div>
        <Tooltip text={guide.appearsOn} side="left">
          <MapPin className="h-4 w-4 text-stone-400 hover:text-amber-600" />
        </Tooltip>
      </div>

      <SizeSwatch ratio={guide.aspectRatioValue} />

      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-1 text-stone-500"><Monitor className="h-3 w-3" /> Desktop size</dt>
          <dd className="font-semibold text-stone-800">{guide.desktop.w} × {guide.desktop.h}px</dd>
        </div>
        {guide.mobile && (
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1 text-stone-500"><Smartphone className="h-3 w-3" /> Mobile size</dt>
            <dd className="font-semibold text-stone-800">{guide.mobile.w} × {guide.mobile.h}px</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-stone-500">Aspect ratio</dt>
          <dd className="font-semibold text-stone-800">{guide.aspectRatioLabel}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-stone-500">Max file size</dt>
          <dd className="font-semibold text-stone-800">{guide.maxFileSizeMB}MB</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-1 text-stone-500"><FileImage className="h-3 w-3" /> Formats</dt>
          <dd className="font-semibold text-stone-800">{guide.formats.join(", ")}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function BannerSizeGuideSection() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* storage full */ }
      return next;
    });
  }

  const live = BANNER_SIZE_GUIDE.filter((g) => g.live);
  const notLive = BANNER_SIZE_GUIDE.filter((g) => !g.live);

  return (
    <div className="mx-1 overflow-hidden rounded-2xl border border-amber-100/70 bg-white/70 shadow-sm shadow-amber-900/[0.04] backdrop-blur">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30">
            <Ruler className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-stone-900">Recommended Banner Sizes</p>
            <p className="text-xs text-stone-500">Exact pixel dimensions for every banner position — know what to design before you upload.</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-amber-100/80 px-4 pb-5 pt-4 sm:px-6">
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">
                <Info className="h-4 w-4 shrink-0" />
                <p>Images are automatically optimized on upload (resized to a max of 1600px wide, compressed for fast loading) — upload close to the recommended size for the sharpest result.</p>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Live on your storefront</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {live.map((g) => <SizeCard key={g.key} guide={g} />)}
              </div>

              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-stone-400">Reserved for future placements</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {notLive.map((g) => <SizeCard key={g.key} guide={g} />)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
