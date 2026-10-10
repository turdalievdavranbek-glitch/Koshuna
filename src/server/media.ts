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

type VideoCodecs = { container: string; video?: string; pixFmt?: string; audio?: string };

async function probeCodecs(full: string): Promise<VideoCodecs | null> {
  const bin = process.env.FFPROBE_PATH || "ffprobe";
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["-v", "error", "-show_entries", "format=format_name:stream=codec_type,codec_name,pix_fmt", "-of", "json", full],
      { timeout: 15_000, maxBuffer: 1024 * 1024 },
    );
    const data = JSON.parse(String(stdout)) as {
      format?: { format_name?: string };
      streams?: { codec_type?: string; codec_name?: string; pix_fmt?: string }[];
    };
    const video = data.streams?.find((s) => s.codec_type === "video");
    const audio = data.streams?.find((s) => s.codec_type === "audio");
    return { container: data.format?.format_name ?? "", video: video?.codec_name, pixFmt: video?.pix_fmt, audio: audio?.codec_name };
  } catch {
    return null;
  }
}

/** True when phones (Android WebView, iOS Safari) can play the file as it is: H.264 8-bit + AAC (or no sound) in mp4/mov. */
export function playableEverywhere(codecs: VideoCodecs): boolean {
  const mp4 = codecs.container.includes("mp4") || codecs.container.includes("mov");
  const video = codecs.video === "h264" && (!codecs.pixFmt || codecs.pixFmt === "yuv420p" || codecs.pixFmt === "yuvj420p");
  const audio = !codecs.audio || codecs.audio === "aac";
  return mp4 && video && audio;
}

/**
 * Turn any uploaded video into an H.264/AAC .mp4 with the index at the start (faststart),
 * the one format every phone WebView plays. In-app recordings arrive as Chrome MediaRecorder WebM
 * (VP9/Opus, no duration, no seek index) and iPhone files can be HEVC .mov — both are re-encoded.
 * Files that are already H.264/AAC are only remuxed (copy, no quality loss).
 * Returns the new relative path and mime, or null when ffmpeg failed (the original stays in place).
 */
export async function normalizeVideo(relative: string): Promise<{ relative: string; mime: string } | null> {
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  const full = path.join(mediaRoot(), relative);
  const codecs = await probeCodecs(full);
  if (!codecs?.video) return null;
  const outRelative = relative.replace(/\.[^./]+$/, "") + ".mp4";
  const out = path.join(mediaRoot(), outRelative);
  const tmp = `${out}.normalize.tmp`;
  const copy = playableEverywhere(codecs);
  const codecArgs = copy
    ? ["-c", "copy"]
    : [
        "-vf",
        "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2:out_range=tv,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "26",
        "-maxrate",
        "2500k",
        "-bufsize",
        "5000k",
        "-pix_fmt",
        "yuv420p",
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-color_range",
        "tv",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
      ];
  try {
    await execFileAsync(
      bin,
      ["-nostdin", "-v", "error", "-y", "-i", full, "-map", "0:v:0", "-map", "0:a:0?", ...codecArgs, "-movflags", "+faststart", "-f", "mp4", tmp],
      { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 },
    );
    await rename(tmp, out);
    const { chmod } = await import("fs/promises");
    await chmod(out, 0o644);
    if (out !== full) await unlink(full).catch(() => undefined);
    return { relative: outRelative, mime: "video/mp4" };
  } catch {
    await unlink(tmp).catch(() => undefined);
    return null;
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
