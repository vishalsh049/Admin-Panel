const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const slugify = require("../utils/slugify");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "categories");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const MAX_WIDTH = 1600;
const QUALITY = 80;

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || "category";
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, WEBP, and GIF images are allowed"));
  }
  cb(null, true);
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPipeline(sharpInstance, format) {
  const resized = sharpInstance.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  if (format === "jpeg") return resized.jpeg({ quality: QUALITY, mozjpeg: true });
  if (format === "png") return resized.png({ compressionLevel: 9 });
  if (format === "webp") return resized.webp({ quality: QUALITY });
  return resized;
}

// Re-encodes in the file's own format and only overwrites if actually
// smaller (see middleware/productUpload.js for the full rationale). Also
// retries on open — Windows can briefly lock a file multer just finished
// writing (antivirus/file-indexing).
async function compressFile(file) {
  if (file.mimetype === "image/gif") return;
  const fs = require("fs");
  const filePath = file.path;
  const attempts = [0, 200, 500, 1000, 2000];
  let lastError;

  for (const wait of attempts) {
    if (wait) await delay(wait);
    try {
      const originalSize = fs.statSync(filePath).size;
      const metadata = await sharp(filePath).metadata();
      const buffer = await buildPipeline(sharp(filePath), metadata.format).toBuffer();
      if (buffer.length < originalSize) {
        fs.writeFileSync(filePath, buffer);
      }
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function relativePath(filename) {
  return `/uploads/categories/${filename}`;
}

async function compressSingle(req, res, next) {
  try {
    if (req.file) await compressFile(req.file);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  single: (field) => [multerUpload.single(field), compressSingle],
  relativePath,
  UPLOAD_DIR,
};
