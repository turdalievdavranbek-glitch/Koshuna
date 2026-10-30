/** Photos and posters only. Gallery video is not re-encoded (D2). */

export async function compressImage(blob: Blob, maxSide = 1600, quality = 0.8): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return blob;
    }
  }
  try {
    const jpeg = blob.type === "image/jpeg" || blob.type === "image/jpg";
    if (jpeg && blob.size <= 400 * 1024 && bitmap.width <= maxSide && bitmap.height <= maxSide && bitmap.width <= 1600 && bitmap.height <= 1600) {
      return blob;
    }
    const longest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxSide / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return blob;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const out = await canvas.convertToBlob({ type: "image/jpeg", quality });
      return out ?? blob;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return out ?? blob;
  } catch {
    return blob;
  } finally {
    bitmap.close?.();
  }
}
