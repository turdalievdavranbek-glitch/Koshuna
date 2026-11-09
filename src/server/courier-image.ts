import sharp from "sharp";
import { readPrivatePhoto, removePrivateFile, thumbRel, writePrivateBytes } from "./courier-files";

const FULL = 1600;
const THUMB = 320;
const QUALITY = 80;

async function jpeg(bytes: Buffer, maxSide: number): Promise<Buffer> {
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
}

/** EXIF-upright JPEG, longest side at most 1600, plus a 320px thumbnail. */
export async function courierJpegPair(bytes: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  const full = await jpeg(bytes, FULL);
  const thumb = await jpeg(full, THUMB);
  return { full, thumb };
}

export async function courierThumb(bytes: Buffer): Promise<Buffer> {
  return jpeg(bytes, THUMB);
}

/** Writes the 320px file next to an existing photo. Returns the thumb path. */
export async function ensureCourierThumb(rel: string): Promise<string | null> {
  const thumb = thumbRel(rel);
  if (!thumb) return null;
  if (await readPrivatePhoto(thumb)) return thumb;
  const full = await readPrivatePhoto(rel);
  if (!full) return null;
  await writePrivateBytes(thumb, await courierThumb(full.bytes));
  return thumb;
}

/**
 * Shrink an already stored photo to the upload size and make sure its thumbnail exists.
 * Returns the path to keep (a png/webp may become jpg).
 */
export async function refreshStoredCourierPhoto(rel: string): Promise<string> {
  const file = await readPrivatePhoto(rel);
  if (!file) return rel;
  const meta = await sharp(file.bytes, { failOn: "none" }).metadata();
  const thumb = thumbRel(rel);
  const haveThumb = thumb ? await readPrivatePhoto(thumb) : null;
  const big =
    (meta.width ?? 0) > FULL ||
    (meta.height ?? 0) > FULL ||
    file.bytes.length > 400 * 1024 ||
    meta.format !== "jpeg" ||
    !haveThumb;
  if (!big) return rel;
  const pair = await courierJpegPair(file.bytes);
  const next = rel.replace(/\.(png|webp|jpe?g)$/i, ".jpg");
  const nextThumb = thumbRel(next);
  if (!nextThumb) return rel;
  await writePrivateBytes(next, pair.full);
  await writePrivateBytes(nextThumb, pair.thumb);
  if (next !== rel) await removePrivateFile(rel);
  return next;
}
