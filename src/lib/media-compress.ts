/** Photos and posters only. Gallery video is not re-encoded (D2). */

/** JPEG EXIF orientation 1–8. Missing or unreadable tags stay at 1 (no rotation). */
function jpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2 || offset + 2 + size > bytes.length) return 1;
    if (marker === 0xe1) {
      const found = exifOrientation(bytes.subarray(offset + 4, offset + 2 + size));
      if (found) return found;
    }
    offset += 2 + size;
  }
  return 1;
}

function exifOrientation(app1: Uint8Array): number | null {
  if (app1.length < 14) return null;
  if (app1[0] !== 0x45 || app1[1] !== 0x78 || app1[2] !== 0x69 || app1[3] !== 0x66 || app1[4] !== 0 || app1[5] !== 0) return null;
  const view = new DataView(app1.buffer, app1.byteOffset, app1.byteLength);
  const little = app1[6] === 0x49 && app1[7] === 0x49;
  const big = app1[6] === 0x4d && app1[7] === 0x4d;
  if (!little && !big) return null;
  if (view.getUint16(8, little) !== 0x002a) return null;
  let dir = view.getUint32(10, little);
  if (dir < 8 || dir + 2 > app1.length) return null;
  const count = view.getUint16(dir, little);
  dir += 2;
  for (let i = 0; i < count; i += 1) {
    const entry = dir + i * 12;
    if (entry + 12 > app1.length) return null;
    if (view.getUint16(entry, little) !== 0x0112) continue;
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return null;
}

function drawUpright(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  orientation: number,
  width: number,
  height: number,
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(Math.PI / 2);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
}

export async function compressImage(blob: Blob, maxSide = 1600, quality = 0.8): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return blob;
  const jpeg = blob.type === "image/jpeg" || blob.type === "image/jpg" || blob.type === "";
  let orientation = 1;
  if (jpeg) {
    try {
      orientation = jpegOrientation(new Uint8Array(await blob.slice(0, 128 * 1024).arrayBuffer()));
    } catch {
      orientation = 1;
    }
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "none" });
  } catch {
    try {
      bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      orientation = 1;
    } catch {
      try {
        bitmap = await createImageBitmap(blob);
        orientation = 1;
      } catch {
        return blob;
      }
    }
  }
  try {
    if (orientation === 1 && jpeg && blob.size <= 400 * 1024 && bitmap.width <= maxSide && bitmap.height <= maxSide) return blob;
    const swap = orientation >= 5;
    const srcW = bitmap.width || 1;
    const srcH = bitmap.height || 1;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvasW = swap ? height : width;
    const canvasH = swap ? width : height;
    const paint = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
      ctx.save();
      drawUpright(ctx, bitmap, orientation, width, height);
      ctx.restore();
    };
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(canvasW, canvasH);
      const ctx = canvas.getContext("2d");
      if (!ctx) return blob;
      paint(ctx);
      const out = await canvas.convertToBlob({ type: "image/jpeg", quality });
      return out ?? blob;
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    paint(ctx);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return out ?? blob;
  } catch {
    return blob;
  } finally {
    bitmap.close?.();
  }
}
