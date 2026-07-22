// Downloads a remote (WooCommerce-hosted) image and stores it locally so the
// site keeps working after WooCommerce is disconnected. Extension is derived
// from the downloaded response's real Content-Type, not the source URL —
// same reasoning as middleware/productUpload.js: never trust a filename/URL
// string for the extension of something written into a publicly-served dir.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function downloadImage(url, subfolder) {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    const contentType = String(res.headers["content-type"] || "").split(";")[0].trim();
    const ext = EXTENSION_BY_MIME[contentType];
    if (!ext) {
      console.error(`downloadImage: unrecognized content-type "${contentType}" for ${url}`);
      return null; // not a recognized image type — skip rather than guess
    }

    const dir = path.join(__dirname, "..", "uploads", subfolder);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `woo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(dir, filename), res.data);
    return `/uploads/${subfolder}/${filename}`;
  } catch (err) {
    console.error(`downloadImage: failed to download ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { downloadImage };
