import { listingInOblast } from "./places";
import { socialCounts, type ReactionsByVoter } from "./reactions";
import type { Listing } from "./types";
import { isVideoListing } from "./video-ai";

export const CIRCLE_TTL_MS = 60 * 60 * 1000;
export const CIRCLE_MAX = 10;

export type CircleScope = {
  city: string;
  oblast: string;
};

export function circleScopeFrom(city: string, filtersCity: string, oblast: string): CircleScope {
  return {
    city: filtersCity && filtersCity !== "all" ? filtersCity : city,
    oblast,
  };
}

export type CirclePick = {
  listings: Listing[];
  widened: boolean;
};

type CacheRow = { key: string; at: number; ids: string[] };

const CACHE_KEY = "koshuna-circle-cache";

let cache: CacheRow | null = null;

function loadCache(): CacheRow | null {
  if (cache) return cache;
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheRow;
    if (parsed && typeof parsed.at === "number" && Array.isArray(parsed.ids) && typeof parsed.key === "string") {
      cache = parsed;
      return cache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveCache(row: CacheRow) {
  cache = row;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(row));
  } catch {
    /* ignore */
  }
}

/** Circles rank by likes only. Comments stay hidden (Р-101). */
export function engagementScore(id: string, reactions: ReactionsByVoter, commentCount = 0): number {
  void commentCount;
  return socialCounts(id, reactions, 0).likes;
}

function shownInCircles(item: Listing): boolean {
  return !item.underReview && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed" && item.status !== "hidden";
}

export function listingInCircleScope(item: Listing, scope: CircleScope): boolean {
  if (scope.oblast && scope.oblast !== "any") return listingInOblast(item, scope.oblast);
  if (scope.city && scope.city !== "all") return item.city === scope.city;
  return true;
}

function rankVideos(list: Listing[], reactions: ReactionsByVoter): Listing[] {
  return [...list]
    .filter(isVideoListing)
    .filter(shownInCircles)
    .sort((a, b) => engagementScore(b.id, reactions) - engagementScore(a.id, reactions));
}

function scopeKey(scope: CircleScope, stamp: string[]): string {
  return `${scope.city}|${scope.oblast}|${CIRCLE_MAX}|${stamp.join(",")}`;
}

/** Top videos in the selected city or oblast only. Never widen, never fill with photos. */
export function pickNeighborCircles(
  all: Listing[],
  scope: CircleScope,
  reactions: ReactionsByVoter,
  comments: Record<string, { length: number } | undefined>,
  now = Date.now(),
  force = false,
): CirclePick {
  void comments;
  const stamp = all.filter(isVideoListing).map((item) => item.id).sort();
  const key = scopeKey(scope, stamp);
  const hit = force ? null : loadCache();
  if (hit && hit.key === key && now - hit.at < CIRCLE_TTL_MS) {
    const map = new Map(all.map((item) => [item.id, item]));
    return {
      listings: hit.ids
        .map((id) => map.get(id))
        .filter((item): item is Listing => Boolean(item && shownInCircles(item) && isVideoListing(item) && listingInCircleScope(item, scope)))
        .slice(0, CIRCLE_MAX),
      widened: false,
    };
  }

  const listings = rankVideos(all, reactions)
    .filter((item) => listingInCircleScope(item, scope))
    .slice(0, CIRCLE_MAX);
  saveCache({ key, at: now, ids: listings.map((item) => item.id) });
  return { listings, widened: false };
}

/** Server order, still only real videos in the selected region. */
export function circlesFromIds(ids: string[], listings: Listing[], scope: CircleScope): Listing[] {
  const map = new Map(listings.map((item) => [item.id, item]));
  const out: Listing[] = [];
  for (const id of ids) {
    const item = map.get(id);
    if (!item || !isVideoListing(item) || !shownInCircles(item) || !listingInCircleScope(item, scope)) continue;
    out.push(item);
    if (out.length >= CIRCLE_MAX) break;
  }
  return out;
}

export function isReelMedia(item: Listing): boolean {
  return isVideoListing(item) || item.hasPhoto || item.photos.length > 0;
}

function postedMs(item: Listing): number {
  if (!item.postedAt) return 0;
  const ms = Date.parse(item.postedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Tapped item, then the rest of the circles, then other public photo and video
 * listings of the same region, newest first.
 */
export function reelsFeed(startId: string, circles: Listing[], region: Listing[]): Listing[] {
  const media = region.filter((item) => shownInCircles(item) && isReelMedia(item));
  const byId = new Map(media.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const out: Listing[] = [];
  const push = (item: Listing | undefined) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };
  push(byId.get(startId));
  for (const item of circles) push(byId.get(item.id));
  const rest = media.filter((item) => !seen.has(item.id)).sort((a, b) => postedMs(b) - postedMs(a) || a.id.localeCompare(b.id));
  for (const item of rest) push(item);
  return out;
}

export function resetCircleCache() {
  cache = null;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
