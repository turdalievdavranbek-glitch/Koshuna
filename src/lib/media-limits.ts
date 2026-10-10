/** Single place for upload caps. Shops enforce these on client and `/api/shops/validate`. Listing video is checked on the server in `/api/uploads`. Override with env. */
export function videoMaxBytes(): number {
  const raw = Number(process.env.VIDEO_MAX_BYTES || process.env.NEXT_PUBLIC_VIDEO_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 200 * 1024 * 1024;
}

export function voiceMaxSeconds(): number {
  const raw = Number(process.env.NEXT_PUBLIC_VOICE_MAX_SECONDS || process.env.VOICE_MAX_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

export function videoMaxSeconds(): number {
  const raw = Number(process.env.VIDEO_MAX_SECONDS || process.env.NEXT_PUBLIC_VIDEO_MAX_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

/** Product-counter walkthrough is shorter than a shop intro. */
export function shopVideoMaxSeconds(): number {
  const raw = Number(process.env.SHOP_VIDEO_MAX_SECONDS || process.env.NEXT_PUBLIC_SHOP_VIDEO_MAX_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
}

export function shopVideoMaxStills(): number {
  const raw = Number(process.env.SHOP_VIDEO_MAX_STILLS || process.env.NEXT_PUBLIC_SHOP_VIDEO_MAX_STILLS);
  return Number.isFinite(raw) && raw > 0 ? Math.min(8, raw) : 6;
}

export function videoLimitError(sizeBytes?: number, durationSec?: number): string | null {
  if (sizeBytes != null && sizeBytes > videoMaxBytes()) return "video-size";
  if (durationSec != null && durationSec > videoMaxSeconds()) return "video-duration";
  return null;
}
