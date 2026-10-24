import { newId } from "../model/ids";
import type { Asset } from "../model/types";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export class UploadError extends Error {}

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
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new UploadError(`"${file.name}" could not be decoded as an image.`));
      img.onload = () => {
        resolve({
          id: newId(),
          name: file.name.slice(0, 120),
          mime: file.type,
          dataUrl,
          width: img.naturalWidth || 1,
          height: img.naturalHeight || 1,
          bytes: file.size,
          addedAt: Date.now(),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
