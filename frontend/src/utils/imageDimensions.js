// Client-side helpers for the Banner size-guidance feature — reading natural
// image dimensions, comparing against a recommended spec, and an automatic
// (non-interactive) center-crop + resize to a target size before upload.

// Loads a File/Blob or a remote URL just far enough to read its natural
// pixel dimensions, without ever appending it to the DOM.
export function getImageDimensions(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isBlob = fileOrUrl instanceof Blob;
    const url = isBlob ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    img.onload = () => {
      if (isBlob) URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (isBlob) URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

// Compares an actual width/height against a recommended spec's desktop (or
// mobile) target. "Exact" allows a small tolerance since asking admins to
// hit a pixel count precisely is unreasonable; aspect ratio mismatch is
// flagged separately since that's what actually causes visible cropping.
export function matchesRecommended(width, height, target, tolerancePct = 3) {
  if (!target || !width || !height) return { exact: false, ratioOk: false };
  const wDiff = Math.abs(width - target.w) / target.w;
  const hDiff = Math.abs(height - target.h) / target.h;
  const exact = wDiff <= tolerancePct / 100 && hDiff <= tolerancePct / 100;

  const actualRatio = width / height;
  const targetRatio = target.w / target.h;
  const ratioOk = Math.abs(actualRatio - targetRatio) / targetRatio <= 0.04; // ~4% ratio tolerance

  return { exact, ratioOk, actualRatio, targetRatio };
}

// Automatic center-crop to the target aspect ratio, then resize to the
// target pixel dimensions — mirrors object-cover behaviour so the result
// matches what the storefront will actually show. Returns a File (not a
// bare Blob) so it drops straight into the existing uploadMedia(file) call.
export function centerCropResizeToBlob(file, targetW, targetH, outputType = "image/jpeg", quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const targetRatio = targetW / targetH;
      const srcRatio = img.naturalWidth / img.naturalHeight;

      let sx, sy, sw, sh;
      if (srcRatio > targetRatio) {
        // source is wider than target — crop the sides
        sh = img.naturalHeight;
        sw = sh * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
        sy = 0;
      } else {
        // source is taller than target — crop top/bottom
        sw = img.naturalWidth;
        sh = sw / targetRatio;
        sx = 0;
        sy = (img.naturalHeight - sh) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Crop/resize failed"));
          const ext = outputType === "image/png" ? "png" : "jpg";
          resolve(new File([blob], `banner-autofit.${ext}`, { type: outputType }));
        },
        outputType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image for cropping"));
    };
    img.src = url;
  });
}
