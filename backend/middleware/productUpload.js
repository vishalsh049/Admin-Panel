const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const slugify = require("../utils/slugify");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// The stored extension MUST come from this fixed map, never from the
// client-supplied originalname — otherwise a request could set
// Content-Type: image/jpeg while naming the file "x.html", pass the MIME
// filter, and get served back by express.static as real text/html.
const EXTENSION_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 80;

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] || ".jpg";
    const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || "image";
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
  if (format === "jpeg") return resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  if (format === "png") return resized.png({ compressionLevel: 9 });
  if (format === "webp") return resized.webp({ quality: JPEG_QUALITY });
  return resized;
}

// Resizes/compresses an uploaded file in place, re-encoding in its OWN
// format (a .png stays a valid .png with transparency, a .webp stays webp)
// rather than forcing a conversion that could both mismatch the file's
// extension and — for already-efficient source formats — produce a *larger*
// file than the original. Only overwrites when the result is actually
// smaller. GIFs are left untouched (sharp would collapse animation to a
// single frame).
//
// On Windows, a file that multer just finished writing can briefly be locked
// by antivirus/file-indexing, so the first read attempt right after upload
// can fail — retry a couple of times with a short backoff before giving up.
async function compressFile(file) {
  if (file.mimetype === "image/gif") return;

  const filePath = file.path;
  const attempts = [0, 200, 500, 1000, 2000];
  let lastError;

  for (const wait of attempts) {
    if (wait) await delay(wait);
    try {
      const fs = require("fs");
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
  // Every attempt failed to parse this as a real image (e.g. the bytes don't
  // match the claimed type) — don't leave an unvalidated file sitting in the
  // publicly-served uploads directory.
  try {
    require("fs").unlinkSync(filePath);
  } catch {}
  throw lastError;
}

function relativePath(filename) {
  return `/uploads/products/${filename}`;
}

async function compressSingle(req, res, next) {
  try {
    if (req.file) await compressFile(req.file);
    next();
  } catch (error) {
    next(error);
  }
}

async function compressMultiple(req, res, next) {
  try {
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        await compressFile(file);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  single: (field) => [multerUpload.single(field), compressSingle],
  array: (field, maxCount) => [multerUpload.array(field, maxCount), compressMultiple],
  relativePath,
  UPLOAD_DIR,
};
