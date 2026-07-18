/**
 * Shared SEO fields section used by every content editor (pages, blog posts,
 * products, categories). Controlled by the parent form: pass the three values
 * and an onChange(name, value) callback. Shows Google-style length guidance
 * and a live SERP snippet preview.
 */

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function Counter({ value, limit }) {
  const length = (value || "").length;
  const over = length > limit;
  return (
    <span className={`text-[11px] ${over ? "font-semibold text-rose-600" : "text-slate-400"}`}>
      {length}/{limit}
    </span>
  );
}

export default function SeoFieldsPanel({ seoTitle, seoDescription, seoKeywords, onChange, fallbackTitle = "" }) {
  const previewTitle = seoTitle || fallbackTitle || "Page title";
  const previewDescription = seoDescription || "A description of this page will appear here in search results.";

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-600">SEO Title</label>
          <Counter value={seoTitle} limit={TITLE_LIMIT} />
        </div>
        <input
          value={seoTitle || ""}
          onChange={(e) => onChange("seo_title", e.target.value)}
          placeholder={fallbackTitle ? `Defaults to: ${fallbackTitle}` : "Shown in the browser tab and search results"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-600">SEO Description</label>
          <Counter value={seoDescription} limit={DESCRIPTION_LIMIT} />
        </div>
        <textarea
          value={seoDescription || ""}
          onChange={(e) => onChange("seo_description", e.target.value)}
          rows={2}
          placeholder="A short summary shown under the title in search results"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">SEO Keywords</label>
        <input
          value={seoKeywords || ""}
          onChange={(e) => onChange("seo_keywords", e.target.value)}
          placeholder="Comma-separated, e.g. puja items, dhoop, chandan"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {/* SERP preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Search preview</p>
        <p className="truncate text-[15px] leading-snug text-blue-700">{previewTitle}</p>
        <p className="text-xs text-emerald-700">divyadarshnam.com</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{previewDescription}</p>
      </div>
    </div>
  );
}
