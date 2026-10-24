import { newId } from "../model/ids";
import type { Asset } from "../model/types";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export class UploadError extends Error {}

export function fitImageDimensions(
  width: number,
  height: number,
  max = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Read a local image file into an Asset (data URL; stays on this machine). */
export function fileToAsset(file: File): Promise<Asset> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new UploadError(`"${file.name}" is ${file.type || "an unknown type"}. Use PNG, JPEG, WebP, GIF or SVG.`));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new UploadError(`"${file.name}" is larger than 8 MB. Export a smaller version and try again.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new UploadError(`Could not read "${file.name}".`));
    reader.onload = () => {
      if (typeof reader.result !== "string" || reader.result.length === 0) {
        reject(new UploadError(`Could not read "${file.name}".`));
        return;
      }
      const originalDataUrl = reader.result;
      const img = new Image();
      img.onerror = () => reject(new UploadError(`"${file.name}" could not be decoded as an image.`));
      img.onload = () => {
        const naturalWidth = img.naturalWidth || 1;
        const naturalHeight = img.naturalHeight || 1;
        const fitted = fitImageDimensions(naturalWidth, naturalHeight);
        const resized = fitted.width !== naturalWidth || fitted.height !== naturalHeight;
        if (resized && file.type === "image/gif") {
          reject(new UploadError(`"${file.name}" is larger than ${MAX_IMAGE_DIMENSION} px and animated GIFs cannot be scaled safely. Export a smaller GIF and try again.`));
          return;
        }
        let dataUrl = originalDataUrl;
        let mime = file.type;
        if (resized) {
          const canvas = document.createElement("canvas");
          canvas.width = fitted.width;
          canvas.height = fitted.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new UploadError("This browser could not resize that image."));
            return;
          }
          ctx.drawImage(img, 0, 0, fitted.width, fitted.height);
          mime = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
          dataUrl = canvas.toDataURL(mime, 0.92);
        }
        resolve({
          id: newId(),
          name: file.name.slice(0, 120),
          mime,
          dataUrl,
          width: fitted.width,
          height: fitted.height,
          bytes: resized ? Math.ceil(dataUrl.length * 0.75) : file.size,
          addedAt: Date.now(),
        });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
