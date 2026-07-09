import { BASE_URL } from "./api";

export const PLACEHOLDER_IMAGE = `${BASE_URL}/uploads/no-image.png`;

// Handles both the new relative paths ("/uploads/products/x.jpg") and any
// legacy absolute URLs still sitting in the database from before the image
// pipeline was fixed to stop baking the request host into stored paths.
export function getImageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
