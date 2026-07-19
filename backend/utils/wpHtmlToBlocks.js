// Converts WordPress (Gutenberg) rendered HTML into the structured content
// blocks blog_posts.content_json already stores (see components/BlockEditor.jsx
// toStorageBlocks and the storefront ContentRenderer) — paragraph / heading /
// list / quote / image. The storefront renders blocks as real JSX with no
// dangerouslySetInnerHTML, so raw HTML can never be stored; inline formatting
// (<strong>/<em>/<a>) is flattened to plain text by design.
const slugify = require("./slugify");

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "'",
  rsquo: "'",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
};

function decodeEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

// Strips tags and returns the element's text as one trimmed line per <br>.
function toTextLines(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function toText(html) {
  return toTextLines(html).join(" ");
}

// Matches one top-level Gutenberg element at a time. Nested same-tag elements
// (e.g. a list inside a list item) are beyond this regex — the inner markup
// is flattened to text, which is acceptable for blog prose.
const TOP_BLOCK_RE =
  /<(h[1-6]|p|ul|ol|blockquote|figure)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi;

function extractImage(html) {
  const src = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  if (!src) return null;
  const alt = html.match(/<img\b[^>]*\balt=["']([^"']*)["']/i);
  const caption = html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  return {
    type: "image",
    path: decodeEntities(src[1]),
    alt: decodeEntities(alt ? alt[1] : ""),
    caption: caption ? toText(caption[1]) : "",
  };
}

function wpHtmlToBlocks(html) {
  const source = String(html || "");

  // Posts on this site use h5/h6 (not h2/h3) as their section headings, so
  // map levels relatively: the most significant heading tag present becomes
  // level 2, everything deeper becomes level 3 — the only two levels the
  // blog UI supports.
  const headingLevels = [...source.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  const primaryLevel = headingLevels.length ? Math.min(...headingLevels) : 2;

  const blocks = [];
  for (const match of source.matchAll(TOP_BLOCK_RE)) {
    const tag = (match[1] || "img").toLowerCase();
    const inner = match[2] || "";

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]) === primaryLevel ? 2 : 3;
      for (const line of toTextLines(inner)) {
        blocks.push({ type: "heading", level, text: line, id: slugify(line) });
      }
    } else if (tag === "p") {
      for (const line of toTextLines(inner)) {
        blocks.push({ type: "paragraph", text: line });
      }
    } else if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((li) => toText(li[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
    } else if (tag === "blockquote") {
      const cite = inner.match(/<cite\b[^>]*>([\s\S]*?)<\/cite>/i);
      const text = toText(inner.replace(/<cite\b[^>]*>[\s\S]*?<\/cite>/gi, ""));
      if (text) blocks.push({ type: "quote", text, cite: cite ? toText(cite[1]) : undefined });
    } else {
      // figure or bare img
      const image = extractImage(tag === "figure" ? inner : match[0]);
      if (image) {
        blocks.push(image);
      } else if (tag === "figure") {
        // figure wrapping something other than an image (embed, table…) —
        // keep whatever text it holds rather than dropping it silently.
        for (const line of toTextLines(inner)) {
          blocks.push({ type: "paragraph", text: line });
        }
      }
    }
  }
  return blocks;
}

module.exports = { wpHtmlToBlocks, toText, decodeEntities };
