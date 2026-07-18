// Resolves a menu item's effective URL based on its link_type, and builds
// the nested tree the storefront Navbar/Footer render directly.
function resolveUrl(item) {
  if (item.link_type === "category" && item.categoryRef) {
    return `/shop?category=${encodeURIComponent(item.categoryRef.name)}`;
  }
  if (item.link_type === "blog_category" && item.blogCategoryRef) {
    return `/blog?category=${item.blogCategoryRef.slug}`;
  }
  return item.url || "#";
}

function buildPublicItem(item) {
  const data = item.toJSON ? item.toJSON() : item;
  return {
    id: data.id,
    label: data.label,
    url: resolveUrl(data),
    children: (data.children || [])
      .filter((c) => c.is_active)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(buildPublicItem),
  };
}

function buildAdminItem(item) {
  const data = item.toJSON ? item.toJSON() : item;
  return {
    id: data.id,
    location: data.location,
    parent_id: data.parent_id,
    label: data.label,
    link_type: data.link_type,
    url: data.url,
    category_id: data.category_id,
    blog_category_id: data.blog_category_id,
    sort_order: data.sort_order,
    is_active: !!data.is_active,
    resolvedUrl: resolveUrl(data),
  };
}

module.exports = { buildPublicItem, buildAdminItem, resolveUrl };
