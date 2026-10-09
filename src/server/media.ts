import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { mkdir, open, rename, rm, stat, unlink } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { and, eq, inArray } from "drizzle-orm";
import { videoMaxBytes, videoMaxSeconds } from "@/lib/media-limits";
import { getDb } from "./db";
import { media } from "./db/schema";

const execFileAsync = promisify(execFile);

const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const VOICE_MIME = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};

const SUB: Record<string, string> = {
  photo: "uploads",
  video: "videos",
  voice: "voice",
  poster: "thumbs",
};

export const CHUNK_SIZE = 2_097_152;
const MAX_CHUNK = 4 * 1024 * 1024;

let ffprobeWarned = false;

export function mediaRoot(): string {
  const dir = process.env.MEDIA_DIR;
  if (!dir) throw new Error("MEDIA_DIR is missing");
  return dir;
}

export function mediaPrefix(): string {
  return process.env.MEDIA_URL_PREFIX || "/media";
}

function limitBytes(kind: string): number {
  if (kind === "video") return videoMaxBytes();
  if (kind === "voice") {
    const raw = Number(process.env.VOICE_MAX_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : 10 * 1024 * 1024;
  }
  const raw = Number(process.env.PHOTO_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 10 * 1024 * 1024;
}

function voiceMaxSeconds(): number {
  const raw = Number(process.env.VOICE_MAX_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

export function validateUploadStart(input: {
  kind?: string;
  mime?: string;
  size?: number;
  durationSec?: number | null;
}): string | null {
  const kind = input.kind ?? "";
  const mime = input.mime ?? "";
  const size = Number(input.size);
  if (!SUB[kind]) return "bad-kind";
  if (kind === "photo" || kind === "poster") {
    if (!PHOTO_MIME.has(mime)) return "bad-mime";
  } else if (kind === "video") {
    if (!VIDEO_MIME.has(mime)) return "bad-mime";
  } else if (!VOICE_MIME.has(mime)) return "bad-mime";
  if (!Number.isFinite(size) || size < 0 || size > limitBytes(kind)) return "video-size";
  if (kind === "video" && input.durationSec != null && Number(input.durationSec) > videoMaxSeconds()) return "video-duration";
  if (kind === "voice" && input.durationSec != null && Number(input.durationSec) > voiceMaxSeconds()) return "video-duration";
  return null;
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true, mode: 0o755 });
}

export function partPath(uploadId: string): string {
  return path.join(mediaRoot(), "tmp", `${uploadId}.part`);
}

function lastNumeric(text: string): number | null {
  let last: number | null = null;
  for (const part of text.split(/[\s,]+/)) {
    if (!part || part === "N/A") continue;
    const n = Number(part);
    if (Number.isFinite(n)) last = n;
  }
  return last;
}

function warnFfprobeMissing() {
  if (!ffprobeWarned) {
    ffprobeWarned = true;
    console.warn("ffprobe is missing; trusting the declared media duration");
  }
}

/** "missing" means ffprobe is not installed (ENOENT). Any other failure is "unknown". */
export async function probeDuration(file: string, kind = "video"): Promise<number | "missing" | "unknown"> {
  const bin = process.env.FFPROBE_PATH || "ffprobe";
  const probeOpts = { timeout: 15_000, maxBuffer: 8 * 1024 * 1024 };
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
      probeOpts,
    );
    const raw = String(stdout).trim();
    const n = Number(raw);
    if (raw !== "" && raw !== "N/A" && Number.isFinite(n)) return n;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      warnFfprobeMissing();
      return "missing";
    }
  }

  const stream = kind === "voice" ? "a:0" : "v:0";
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["-v", "error", "-select_streams", stream, "-show_entries", "packet=pts_time", "-of", "csv=p=0", file],
      probeOpts,
    );
    const last = lastNumeric(String(stdout));
    if (last == null) return "unknown";
    return last;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      warnFfprobeMissing();
      return "missing";
    }
    return "unknown";
  }
}

export function finalRelative(kind: string, mime: string, id: string = randomUUID()): { relative: string; url: string } {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = EXT[mime] || "bin";
  const relative = path.posix.join(SUB[kind] || "uploads", yyyy, mm, `${id}.${ext}`);
  return { relative, url: `${mediaPrefix()}/${relative}` };
}

export async function writeChunk(uploadId: string, offset: number, bytes: Uint8Array): Promise<{ received: number } | { mismatch: number }> {
  if (bytes.byteLength > MAX_CHUNK) throw new Error("chunk-too-large");
  const file = partPath(uploadId);
  await ensureDir(path.dirname(file));
  let size = 0;
  try {
    size = (await stat(file)).size;
  } catch {
    size = 0;
  }
  if (offset !== size) return { mismatch: size };
  const handle = await open(file, size === 0 ? "w" : "r+", 0o644);
  try {
    await handle.write(bytes, 0, bytes.byteLength, offset);
    await handle.chmod(0o644);
  } finally {
    await handle.close();
  }
  return { received: offset + bytes.byteLength };
}

/**
 * Remux mp4/mov so playback can start before the whole file downloads.
 * Copy only — no re-encode. The temp path has no video extension, so the
 * format is set explicitly. A failure leaves the original file in place.
 */
export async function remuxFaststart(relative: string, mime: string): Promise<void> {
  if (mime !== "video/mp4" && mime !== "video/quicktime") return;
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  const full = path.join(mediaRoot(), relative);
  const tmp = `${full}.faststart.tmp`;
  try {
    await execFileAsync(bin, ["-y", "-i", full, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", tmp], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    await rename(tmp, full);
    const { chmod } = await import("fs/promises");
    await chmod(full, 0o644);
  } catch {
    await unlink(tmp).catch(() => undefined);
  }
}

export async function movePart(uploadId: string, relative: string) {
  const dest = path.join(mediaRoot(), relative);
  await ensureDir(path.dirname(dest));
  await rename(partPath(uploadId), dest);
  const { chmod } = await import("fs/promises");
  await chmod(dest, 0o644);
}

export async function removeFile(relativeOrPart: string) {
  const full = path.isAbsolute(relativeOrPart) ? relativeOrPart : path.join(mediaRoot(), relativeOrPart);
  const root = path.resolve(mediaRoot());
  const resolved = path.resolve(full);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return;
  await unlink(resolved).catch(() => undefined);
  await rm(resolved, { force: true }).catch(() => undefined);
}

export async function attachMedia(ownerId: string, urls: string[], target: { listingId?: string; shopId?: string }) {
  const prefix = `${mediaPrefix()}/`;
  const mine = urls.filter((url) => url.startsWith(prefix));
  if (!mine.length) return;
  const db = getDb();
  await db
    .update(media)
    .set(target.listingId ? { listingId: target.listingId } : { shopId: target.shopId ?? null })
    .where(and(eq(media.ownerId, ownerId), inArray(media.url, mine)));
}

export function durationLimit(kind: string): number {
  return kind === "voice" ? voiceMaxSeconds() : videoMaxSeconds();
}
