import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ImagePlus } from "lucide-react";
import { slugify } from "../utils/slugify";
import { getImageUrl } from "../utils/getImageUrl";
import MediaPicker from "./MediaPicker";

/**
 * Shared "Add Block → fill fields → reorder" editor used by both the Blog
 * post editor (paragraph/heading/list/quote) and the Page Builder (those
 * plus hero/image/cta_banner/faq). Blocks are kept in an editor-friendly
 * shape while editing (e.g. list items as one-per-line text) — call
 * toStorageBlocks/fromStorageBlocks when saving/loading.
 */

export const TEXT_BLOCK_TYPES = ["paragraph", "heading", "list", "quote"];
export const PAGE_BLOCK_TYPES = ["hero", ...TEXT_BLOCK_TYPES, "image", "cta_banner", "faq"];

const BLOCK_LABELS = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  quote: "Quote",
  hero: "Hero",
  image: "Image",
  cta_banner: "CTA Banner",
  faq: "FAQ",
};

const TONES = [
  "from-red-950 via-red-900 to-orange-800",
  "from-orange-900 via-red-900 to-rose-950",
  "from-rose-950 via-orange-900 to-amber-800",
  "from-orange-700 via-red-800 to-red-950",
  "from-amber-600 to-orange-800",
];

const BLOCK_DEFAULTS = {
  paragraph: { type: "paragraph", text: "" },
  heading: { type: "heading", level: 2, text: "" },
  list: { type: "list", ordered: false, items: "" },
  quote: { type: "quote", text: "", cite: "" },
  hero: { type: "hero", eyebrow: "", title: "", subtitle: "", cta_label: "", cta_url: "", tone: TONES[0] },
  image: { type: "image", path: "", alt: "", caption: "" },
  cta_banner: { type: "cta_banner", eyebrow: "", title: "", subtitle: "", cta_label: "", cta_url: "", tone: TONES[3] },
  faq: { type: "faq", items: [{ q: "", a: "" }] },
};

export function toStorageBlocks(blocks) {
  return blocks.map((b) => {
    if (b.type === "heading") return { type: "heading", level: Number(b.level) || 2, text: b.text, id: slugify(b.text) };
    if (b.type === "list") {
      return { type: "list", ordered: !!b.ordered, items: String(b.items || "").split("\n").map((i) => i.trim()).filter(Boolean) };
    }
    if (b.type === "quote") return { type: "quote", text: b.text, cite: b.cite || undefined };
    if (b.type === "faq") return { type: "faq", items: (b.items || []).filter((i) => i.q.trim() || i.a.trim()) };
    return { ...b };
  });
}

export function fromStorageBlocks(content) {
  if (!Array.isArray(content)) return [];
  return content.map((b) => {
    if (b.type === "list") return { ...b, items: (b.items || []).join("\n") };
    if (b.type === "faq") return { ...b, items: (b.items || []).map((i) => ({ q: i.q || "", a: i.a || "" })) };
    return { ...b };
  });
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export default function BlockEditor({ blocks, onChange, allowedTypes = TEXT_BLOCK_TYPES }) {
  const [pickerIndex, setPickerIndex] = useState(null);

  const addBlock = (type) => onChange([...blocks, { ...BLOCK_DEFAULTS[type] }]);
  const updateBlock = (index, changes) => onChange(blocks.map((b, i) => (i === index ? { ...b, ...changes } : b)));
  const removeBlock = (index) => onChange(blocks.filter((_, i) => i !== index));
  const moveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  function renderBannerFields(block, i) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Eyebrow</label>
            <input value={block.eyebrow} onChange={(e) => updateBlock(i, { eyebrow: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input value={block.title} onChange={(e) => updateBlock(i, { title: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Subtitle</label>
          <input value={block.subtitle} onChange={(e) => updateBlock(i, { subtitle: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Button label</label>
            <input value={block.cta_label} onChange={(e) => updateBlock(i, { cta_label: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Button link</label>
            <input value={block.cta_url} onChange={(e) => updateBlock(i, { cta_url: e.target.value })} placeholder="/shop?category=…" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Background gradient</label>
          <select value={block.tone} onChange={(e) => updateBlock(i, { tone: e.target.value })} className={inputCls}>
            {TONES.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
          </select>
          <div className={`mt-1.5 h-6 rounded-lg bg-gradient-to-r ${block.tone}`} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {allowedTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" /> {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No blocks yet. Add one above to start building.</p>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{BLOCK_LABELS[block.type] || block.type}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveBlock(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveBlock(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeBlock(i)} className="rounded p-1 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {block.type === "paragraph" && (
                <textarea value={block.text} onChange={(e) => updateBlock(i, { text: e.target.value })} rows={3} placeholder="Paragraph text…" className={inputCls} />
              )}

              {block.type === "heading" && (
                <div className="flex gap-3">
                  <select value={block.level} onChange={(e) => updateBlock(i, { level: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                  </select>
                  <input value={block.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder="Heading text…" className={inputCls} />
                </div>
              )}

              {block.type === "list" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={block.ordered} onChange={(e) => updateBlock(i, { ordered: e.target.checked })} className="h-3.5 w-3.5" />
                    Numbered list
                  </label>
                  <textarea value={block.items} onChange={(e) => updateBlock(i, { items: e.target.value })} rows={4} placeholder="One item per line…" className={inputCls} />
                </div>
              )}

              {block.type === "quote" && (
                <div className="space-y-2">
                  <textarea value={block.text} onChange={(e) => updateBlock(i, { text: e.target.value })} rows={2} placeholder="Quote text…" className={inputCls} />
                  <input value={block.cite} onChange={(e) => updateBlock(i, { cite: e.target.value })} placeholder="Citation (optional)" className={inputCls} />
                </div>
              )}

              {(block.type === "hero" || block.type === "cta_banner") && renderBannerFields(block, i)}

              {block.type === "image" && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPickerIndex(i)}
                    className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:border-indigo-400"
                  >
                    {block.path ? (
                      <img src={getImageUrl(block.path)} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {block.path ? "Change image" : "Select image"}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={block.alt} onChange={(e) => updateBlock(i, { alt: e.target.value })} placeholder="Alt text" className={inputCls} />
                    <input value={block.caption} onChange={(e) => updateBlock(i, { caption: e.target.value })} placeholder="Caption (optional)" className={inputCls} />
                  </div>
                </div>
              )}

              {block.type === "faq" && (
                <div className="space-y-3">
                  {(block.items || []).map((item, j) => (
                    <div key={j} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Q&A {j + 1}</span>
                        <button
                          type="button"
                          onClick={() => updateBlock(i, { items: block.items.filter((_, k) => k !== j) })}
                          className="rounded p-1 text-rose-400 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <input
                        value={item.q}
                        onChange={(e) => updateBlock(i, { items: block.items.map((it, k) => (k === j ? { ...it, q: e.target.value } : it)) })}
                        placeholder="Question"
                        className={`${inputCls} mb-1.5`}
                      />
                      <textarea
                        value={item.a}
                        onChange={(e) => updateBlock(i, { items: block.items.map((it, k) => (k === j ? { ...it, a: e.target.value } : it)) })}
                        placeholder="Answer"
                        rows={2}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateBlock(i, { items: [...(block.items || []), { q: "", a: "" }] })}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                  >
                    <Plus className="h-3 w-3" /> Add Q&A
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <MediaPicker
        open={pickerIndex !== null}
        onClose={() => setPickerIndex(null)}
        onSelect={(path) => {
          updateBlock(pickerIndex, { path });
          setPickerIndex(null);
        }}
      />
    </div>
  );
}
