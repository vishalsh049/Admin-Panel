// MySQL JSON columns come back from this Sequelize/mysql2 setup as raw
// strings — same workaround as blogSerializer.js / integrationConfigService.js.
function parseJsonValue(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function buildPagePayload(pageInstance, { context = "public" } = {}) {
  const data = pageInstance.toJSON ? pageInstance.toJSON() : pageInstance;

  const base = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    blocks: parseJsonValue(data.blocks_json, []),
    seo_title: data.seo_title || "",
    seo_description: data.seo_description || "",
    seo_keywords: data.seo_keywords || "",
    updatedAt: data.updated_at,
  };

  if (context === "admin") {
    return { ...base, status: data.status || "draft", createdAt: data.created_at };
  }

  return base;
}

module.exports = { buildPagePayload };
