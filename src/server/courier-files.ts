import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
/** Passport photos. Default directory is a sibling of MEDIA_DIR, not inside the public /media tree. */
export function privateMediaRoot(): string | null {
  const set = process.env.PRIVATE_MEDIA_DIR?.trim();
  if (set) return path.resolve(set);
  const media = process.env.MEDIA_DIR?.trim();
  if (!media) return null;
  return path.resolve(media, "..", "koshuna-private");
}

const SAFE_REL = /^(couriers|orders|disputes)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export function resolvePrivate(rel: string): string | null {
  if (!SAFE_REL.test(rel)) return null;
  const rootDir = privateMediaRoot();
  if (!rootDir) return null;
  const root = path.resolve(rootDir);
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

export function sniffImage(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export function photoMaxBytes(): number {
  const raw = Number(process.env.PHOTO_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 8 * 1024 * 1024;
}

export async function writePrivatePhoto(userId: string, bytes: Buffer, ext: "jpg" | "png" | "webp"): Promise<string> {
  return writeScopedPhoto("couriers", userId, bytes, ext);
}

export async function writeScopedPhoto(
  scope: "couriers" | "orders" | "disputes",
  id: string,
  bytes: Buffer,
  ext: "jpg" | "png" | "webp",
): Promise<string> {
  const rel = `${scope}/${id}/${randomUUID()}.${ext}`;
  const full = resolvePrivate(rel);
  if (!full) throw new Error("private-path");
  await mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, bytes, { mode: 0o600 });
  return rel;
}

export async function readPrivatePhoto(rel: string): Promise<{ bytes: Buffer; type: string } | null> {
  const full = resolvePrivate(rel);
  if (!full) return null;
  try {
    const bytes = await readFile(full);
    const ext = path.extname(full).slice(1).toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { bytes, type };
  } catch {
    return null;
  }
}

export async function removePrivate(rel: string | null | undefined): Promise<void> {
  if (!rel) return;
  const full = resolvePrivate(rel);
  if (!full) return;
  await rm(full, { force: true }).catch(() => undefined);
}
