// Strips a baked-in protocol+host from a stored image URL, leaving only the
// path the backend actually serves via `app.use("/uploads", express.static(...))`.
// Old rows may contain absolute URLs like "http://localhost:5001/uploads/products/x.jpg";
// new uploads only ever store the relative form "/uploads/products/x.jpg".
function toRelativeUploadPath(value) {
  if (!value) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return trimmed;

  const withoutHost = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  return withoutHost.startsWith("/") ? withoutHost : `/${withoutHost}`;
}

module.exports = toRelativeUploadPath;
