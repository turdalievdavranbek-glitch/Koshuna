/** Single place for upload caps. Shops enforce these on client and `/api/shops/validate`. Listing video does not yet call this — wire it here when listing upload gets a server check. Override with env. */
export function videoMaxBytes(): number {
  const raw = Number(process.env.VIDEO_MAX_BYTES || process.env.NEXT_PUBLIC_VIDEO_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 80 * 1024 * 1024;
}

export function videoMaxSeconds(): number {
  const raw = Number(process.env.VIDEO_MAX_SECONDS || process.env.NEXT_PUBLIC_VIDEO_MAX_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 180;
}

export function videoLimitError(sizeBytes?: number, durationSec?: number): string | null {
  if (sizeBytes != null && sizeBytes > videoMaxBytes()) return "video-size";
  if (durationSec != null && durationSec > videoMaxSeconds()) return "video-duration";
  return null;
}
