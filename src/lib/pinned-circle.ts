/**
 * Owner address in the home circles. Keys live in app_config (no migration):
 * pinned_video_url, pinned_until, and optional pinned_title_ru, pinned_title_kg,
 * pinned_poster_url, pinned_video_url_kg, pinned_poster_url_kg.
 * Missing or expired keys mean the strip is unchanged.
 */

export const PINNED_REEL_ID = "pinned-owner";

export const PINNED_TITLE = {
  ru: "От Коңшу",
  ky: "Коңшудан",
} as const;

export type PinnedCircle = {
  id: typeof PINNED_REEL_ID;
  videoUrl: string;
  posterUrl: string | null;
  videoUrlKg: string | null;
  posterUrlKg: string | null;
  titleRu: string;
  titleKg: string;
  untilMs: number;
};

function bagOf(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" ? (config as Record<string, unknown>) : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** /media/... on this site, or any https URL. Nothing else. */
export function pinnedMediaUrl(value: string): string | null {
  if (!value || value.includes("\\") || value.includes("..")) return null;
  if (value.startsWith("/media/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePinnedCircle(config: unknown, now = Date.now()): PinnedCircle | null {
  const bag = bagOf(config);
  const videoUrl = pinnedMediaUrl(asText(bag.pinned_video_url));
  const untilRaw = asText(bag.pinned_until);
  if (!videoUrl || !untilRaw) return null;
  const untilMs = Date.parse(untilRaw);
  if (!Number.isFinite(untilMs) || untilMs <= now) return null;
  const poster = pinnedMediaUrl(asText(bag.pinned_poster_url));
  const videoUrlKg = pinnedMediaUrl(asText(bag.pinned_video_url_kg));
  const posterUrlKg = pinnedMediaUrl(asText(bag.pinned_poster_url_kg));
  const titleRu = asText(bag.pinned_title_ru).slice(0, 80) || PINNED_TITLE.ru;
  const titleKg = asText(bag.pinned_title_kg).slice(0, 80) || PINNED_TITLE.ky;
  return {
    id: PINNED_REEL_ID,
    videoUrl,
    posterUrl: poster,
    videoUrlKg,
    posterUrlKg,
    titleRu,
    titleKg,
    untilMs,
  };
}

export function pinnedTitle(pinned: PinnedCircle, lang: string): string {
  return lang === "ky" ? pinned.titleKg : pinned.titleRu;
}

/** KG video and poster only when the UI language is Kyrgyz and pinned_video_url_kg is set. */
export function pinnedMedia(pinned: PinnedCircle, lang: string): { videoUrl: string; posterUrl: string | null } {
  if (lang === "ky" && pinned.videoUrlKg) {
    return { videoUrl: pinned.videoUrlKg, posterUrl: pinned.posterUrlKg };
  }
  return { videoUrl: pinned.videoUrl, posterUrl: pinned.posterUrl };
}
