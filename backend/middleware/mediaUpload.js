const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const slugify = require("../utils/slugify");

// Shared upload target for the Media Library — see middleware/categoryUpload.js
// for the pattern this mirrors (MIME-derived extension only, sharp compression).
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "media");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXTENSION_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const MAX_WIDTH = 1600;
const QUALITY = 80;

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] || ".jpg";
    const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || "media";
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

// Re-encodes in the file's own format, only overwrites if smaller, retries on
// open (Windows AV/indexing can transiently lock a file multer just wrote),
// and returns the final image dimensions so the caller can store them.
async function compressFile(file) {
  const fs = require("fs");
  const filePath = file.path;
  if (file.mimetype === "image/gif") {
    const metadata = await sharp(filePath).metadata();
    return { width: metadata.width, height: metadata.height };
  }

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
      const finalMeta = await sharp(filePath).metadata();
      return { width: finalMeta.width, height: finalMeta.height };
    } catch (error) {
      lastError = error;
    }
  }
  try {
    fs.unlinkSync(filePath);
  } catch {}
  throw lastError;
}

function relativePath(filename) {
  return `/uploads/media/${filename}`;
}

async function compressSingle(req, res, next) {
  try {
    if (req.file) {
      req.fileDimensions = await compressFile(req.file);
    }
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
