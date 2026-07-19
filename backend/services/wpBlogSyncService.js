// WordPress -> MySQL blog sync. One-way import: fetches every published post
// from the WordPress site configured via WOO_URL and inserts/updates rows in
// the existing blog tables. Matched by wp_post_id first, then slug, so
// re-running never duplicates; posts the admin soft-deleted locally are left
// deleted, and manually created posts (no wp_post_id) are never touched
// unless a WordPress post shares their slug. All images are downloaded into
// /uploads/blog so the site keeps working if WordPress goes away (same
// reasoning as the WooCommerce product import).
const fs = require("fs");
const path = require("path");
const { BlogPost, BlogCategory, BlogAuthor } = require("../models");
const woo = require("./wooCommerceService");
const { downloadImage } = require("../utils/wooImageDownloader");
const { wpHtmlToBlocks, toText } = require("../utils/wpHtmlToBlocks");
const slugify = require("../utils/slugify");

// Same gradient palette the block/page editors offer (components/BlockEditor.jsx)
// — the storefront blog cards/hero render `bg-gradient-to-br ${tone}`, so every
// imported category needs one of these to look like the rest of the blog.
const TONES = [
  "from-red-950 via-red-900 to-orange-800",
  "from-orange-900 via-red-900 to-rose-950",
  "from-rose-950 via-orange-900 to-amber-800",
  "from-orange-700 via-red-800 to-red-950",
  "from-amber-600 to-orange-800",
];

const WORDS_PER_MINUTE = 200;

function deleteLocalImage(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/blog/")) return;
  try {
    fs.unlinkSync(path.join(__dirname, "..", imagePath));
  } catch {}
}

// WordPress *_gmt fields have no timezone suffix — anchor them explicitly.
function parseWpDate(value) {
  if (!value) return null;
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function estimateReadTime(blocks) {
  const words = blocks.reduce((sum, b) => {
    const text = [b.text, b.caption, ...(b.items || [])].filter(Boolean).join(" ");
    return sum + (text ? text.split(/\s+/).length : 0);
  }, 0);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function cleanExcerpt(renderedExcerpt) {
  return toText(renderedExcerpt)
    .replace(/\[…\]\s*$/, "")
    .replace(/…\s*$/, "")
    .trim();
}

async function uniquePostSlug(desiredSlug, excludeId, fallbackTitle) {
  const base = slugify(desiredSlug) || slugify(fallbackTitle) || `post-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  // paranoid:false — the slug unique key still counts soft-deleted rows.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await BlogPost.findOne({ where: { slug: candidate }, paranoid: false });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureCategory(term, cache, report) {
  if (cache.has(term.id)) return cache.get(term.id);

  const slug = term.slug || slugify(term.name);
  let category = await BlogCategory.findOne({ where: { slug } });
  if (!category && term.name) {
    category = await BlogCategory.findOne({ where: { name: term.name } });
  }
  if (!category) {
    category = await BlogCategory.create({
      name: term.name,
      slug,
      icon: "Flame",
      tone: TONES[(await BlogCategory.count()) % TONES.length],
    });
    report.categoriesCreated += 1;
  } else if (!category.tone) {
    // Storefront cards need a gradient; fill it in only if the admin never set one.
    await category.update({ tone: TONES[category.id % TONES.length] });
  }
  cache.set(term.id, category);
  return category;
}

async function ensureAuthor(name, cache, report) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let author = await BlogAuthor.findOne({ where: { name } });
  if (!author) {
    author = await BlogAuthor.create({
      name,
      initials: name.slice(0, 2).toUpperCase(),
    });
    report.authorsCreated += 1;
  }
  cache.set(key, author);
  return author;
}

// Content image blocks arrive holding the remote WordPress URL — download
// each into /uploads/blog and rewrite the path. If a download fails the
// remote URL is kept: the storefront's getImageUrl passes absolute URLs
// through untouched, so the image still renders as long as WordPress is up.
async function localizeImageBlocks(blocks, report) {
  const result = [];
  for (const block of blocks) {
    if (block.type === "image" && /^https?:\/\//i.test(block.path)) {
      const localPath = await downloadImage(block.path, "blog");
      if (localPath) report.imagesImported += 1;
      result.push({ ...block, path: localPath || block.path });
    } else {
      result.push(block);
    }
  }
  return result;
}

async function syncWordPressPosts() {
  const report = {
    postsCreated: 0,
    postsUpdated: 0,
    postsUnchanged: 0,
    postsSkipped: 0,
    categoriesCreated: 0,
    authorsCreated: 0,
    imagesImported: 0,
    errors: [],
  };

  const wpPosts = await woo.fetchAllBlogPosts();
  const categoryCache = new Map(); // wp term id -> BlogCategory
  const authorCache = new Map(); // lowercased name -> BlogAuthor

  for (const wp of wpPosts) {
    const title = toText(wp.title?.rendered) || `Post ${wp.id}`;
    try {
      let post = await BlogPost.findOne({ where: { wp_post_id: wp.id }, paranoid: false });
      if (!post && wp.slug) {
        post = await BlogPost.findOne({ where: { slug: wp.slug }, paranoid: false });
      }

      // Deliberately deleted in the admin — don't resurrect it.
      if (post && post.deleted_at) {
        report.postsSkipped += 1;
        report.errors.push(`Post ${wp.id} (${title}): skipped — deleted locally`);
        continue;
      }

      const wpModified = parseWpDate(wp.modified_gmt || wp.modified);
      if (
        post &&
        post.wp_post_id &&
        post.wp_modified_at &&
        wpModified &&
        new Date(post.wp_modified_at).getTime() === wpModified.getTime()
      ) {
        report.postsUnchanged += 1;
        continue;
      }

      const embedded = wp._embedded || {};
      const terms = (embedded["wp:term"] || []).flat();
      const categoryTerm = terms.find((t) => t.taxonomy === "category");
      const tagNames = terms.filter((t) => t.taxonomy === "post_tag").map((t) => t.name);
      const authorName = embedded.author?.[0]?.name || "Divya Darshnam";
      const featuredMediaUrl = embedded["wp:featuredmedia"]?.[0]?.source_url || null;

      const category = categoryTerm ? await ensureCategory(categoryTerm, categoryCache, report) : null;
      const author = await ensureAuthor(authorName, authorCache, report);

      const blocks = await localizeImageBlocks(wpHtmlToBlocks(wp.content?.rendered), report);
      const excerpt = cleanExcerpt(wp.excerpt?.rendered);
      const slug = await uniquePostSlug(wp.slug, post?.id || null, title);

      let featuredImage = post?.featured_image || null;
      if (featuredMediaUrl) {
        const localPath = await downloadImage(featuredMediaUrl, "blog");
        if (localPath) {
          deleteLocalImage(post?.featured_image);
          featuredImage = localPath;
          report.imagesImported += 1;
        }
      }

      // No Yoast/SEO plugin data is exposed by this WordPress site's REST API,
      // so fall back to the post's own title/excerpt/tags (yoast_head_json is
      // used when present).
      const yoast = wp.yoast_head_json || {};
      const payload = {
        title,
        slug,
        excerpt: excerpt || null,
        content_json: blocks,
        category_id: category ? category.id : post?.category_id || null,
        author_id: author.id,
        tags: tagNames,
        featured_image: featuredImage,
        status: "published",
        read_time: estimateReadTime(blocks),
        published_at: parseWpDate(wp.date_gmt || wp.date) || new Date(),
        seo_title: yoast.title || title,
        seo_description: yoast.description || excerpt.slice(0, 300) || null,
        seo_keywords: tagNames.join(", ").slice(0, 255) || null,
        wp_post_id: wp.id,
        wp_modified_at: wpModified,
      };

      if (post) {
        await post.update(payload);
        report.postsUpdated += 1;
      } else {
        await BlogPost.create(payload);
        report.postsCreated += 1;
      }
    } catch (err) {
      report.postsSkipped += 1;
      const detail = Array.isArray(err.errors) && err.errors.length
        ? err.errors.map((e) => `${e.path}: ${e.message}`).join("; ")
        : err.message;
      report.errors.push(`Post ${wp.id} (${title}): ${detail}`);
    }
  }

  return report;
}

module.exports = { syncWordPressPosts };
