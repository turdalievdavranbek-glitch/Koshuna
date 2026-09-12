import { oblastOfListing, type OblastId } from "./places";
import { socialCounts, type ReactionsByVoter } from "./reactions";
import type { Listing } from "./types";
import { isVideoListing } from "./video-ai";

export const CIRCLE_TTL_MS = 60 * 60 * 1000;
export const CIRCLE_MIN = 6;
export const CIRCLE_MAX = 12;

/** Adjacent oblasts used when the selected region has too few videos. */
const WIDEN: Record<string, OblastId[]> = {
  bishkek: ["chuy"],
  chuy: ["bishkek", "issyk-kul", "talas", "naryn"],
  osh: ["osh-oblast", "jalal-abad", "batken"],
  "osh-oblast": ["osh", "jalal-abad", "batken"],
  "jalal-abad": ["osh", "osh-oblast", "naryn", "talas"],
  batken: ["osh-oblast", "osh"],
  "issyk-kul": ["chuy", "naryn", "bishkek"],
  naryn: ["issyk-kul", "chuy", "jalal-abad"],
  talas: ["chuy", "jalal-abad", "bishkek"],
};

export type CircleScope = {
  city: string;
  oblast: string;
};

export type CirclePick = {
  listings: Listing[];
  widened: boolean;
};

type CacheRow = { key: string; at: number; ids: string[]; widened: boolean };

let cache: CacheRow | null = null;

export function engagementScore(
  id: string,
  reactions: ReactionsByVoter,
  commentCount: number,
): number {
  const { likes, comments } = socialCounts(id, reactions, commentCount);
  return likes + comments;
}

function placeOk(item: Listing, scope: CircleScope, oblasts: Set<string> | null): boolean {
  if (scope.city && scope.city !== "all") return item.city === scope.city;
  if (!oblasts || !oblasts.size) return true;
  const oblast = oblastOfListing(item);
  return !!oblast && oblasts.has(oblast);
}

function rankVideos(
  list: Listing[],
  reactions: ReactionsByVoter,
  comments: Record<string, { length: number } | undefined>,
): Listing[] {
  return [...list]
    .filter(isVideoListing)
    .filter((item) => item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed")
    .sort((a, b) => {
      const ea = engagementScore(a.id, reactions, comments[a.id]?.length ?? 0);
      const eb = engagementScore(b.id, reactions, comments[b.id]?.length ?? 0);
      return eb - ea;
    });
}

function scopeKey(scope: CircleScope, stamp: string[]): string {
  return `${scope.city}|${scope.oblast}|${stamp.join(",")}`;
}

/**
 * Rank neighbor circles by likes+comments in the selected city/oblast.
 * If fewer than CIRCLE_MIN videos, widen to neighboring oblasts, then the whole country.
 */
export function pickNeighborCircles(
  all: Listing[],
  scope: CircleScope,
  reactions: ReactionsByVoter,
  comments: Record<string, { length: number } | undefined>,
  now = Date.now(),
): CirclePick {
  const stamp = all.filter(isVideoListing).map((item) => item.id).sort();
  const key = scopeKey(scope, stamp);
  if (cache && cache.key === key && now - cache.at < CIRCLE_TTL_MS) {
    const map = new Map(all.map((item) => [item.id, item]));
    return {
      listings: cache.ids.map((id) => map.get(id)).filter((item): item is Listing => Boolean(item)),
      widened: cache.widened,
    };
  }

  const oblast =
    scope.oblast && scope.oblast !== "any"
      ? scope.oblast
      : scope.city && scope.city !== "all"
        ? undefined
        : undefined;
  const primary = new Set<string>();
  if (oblast) primary.add(oblast);
  else if (scope.city && scope.city !== "all") {
    /* city match is handled in placeOk */
  }

  const ranked = rankVideos(all, reactions, comments);
  let pool = ranked.filter((item) => placeOk(item, scope, primary.size ? primary : null));
  let widened = false;

  if (pool.length < CIRCLE_MIN) {
    const seed = oblast || (scope.city === "bishkek" ? "bishkek" : scope.city === "osh" ? "osh" : "");
    const near = new Set(primary);
    for (const id of WIDEN[seed] ?? []) near.add(id);
    const wider = ranked.filter((item) => placeOk(item, { city: "all", oblast: "any" }, near.size ? near : null));
    if (wider.length > pool.length) {
      pool = wider;
      widened = true;
    }
  }

  if (pool.length < CIRCLE_MIN) {
    pool = ranked;
    widened = true;
  }

  const listings = pool.slice(0, CIRCLE_MAX);
  cache = { key, at: now, ids: listings.map((item) => item.id), widened };
  return { listings, widened };
}

export function resetCircleCache() {
  cache = null;
}
