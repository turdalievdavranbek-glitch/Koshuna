import { oblastOfListing } from "./places";
import { socialCounts, type ReactionsByVoter } from "./reactions";
import type { Listing } from "./types";
import { isVideoListing } from "./video-ai";

export const CIRCLE_TTL_MS = 60 * 60 * 1000;
export const CIRCLE_MAX = 12;

export type CircleScope = {
  city: string;
  oblast: string;
};

export type CirclePick = {
  listings: Listing[];
  widened: boolean;
};

type CacheRow = { key: string; at: number; ids: string[] };

let cache: CacheRow | null = null;

export function engagementScore(
  id: string,
  reactions: ReactionsByVoter,
  commentCount: number,
): number {
  const { likes, comments } = socialCounts(id, reactions, commentCount);
  return likes + comments;
}

function inSelectedRegion(item: Listing, scope: CircleScope): boolean {
  if (scope.oblast && scope.oblast !== "any") return oblastOfListing(item) === scope.oblast;
  if (scope.city && scope.city !== "all") return item.city === scope.city;
  return true;
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

/** Rank neighbor circles by likes+comments in the selected city/oblast only. Never widen. */
export function pickNeighborCircles(
  all: Listing[],
  scope: CircleScope,
  reactions: ReactionsByVoter,
  comments: Record<string, { length: number } | undefined>,
  now = Date.now(),
  force = false,
): CirclePick {
  const stamp = all.filter(isVideoListing).map((item) => item.id).sort();
  const key = scopeKey(scope, stamp);
  if (!force && cache && cache.key === key && now - cache.at < CIRCLE_TTL_MS) {
    const map = new Map(all.map((item) => [item.id, item]));
    return {
      listings: cache.ids.map((id) => map.get(id)).filter((item): item is Listing => Boolean(item)),
      widened: false,
    };
  }

  const listings = rankVideos(all, reactions, comments)
    .filter((item) => inSelectedRegion(item, scope))
    .slice(0, CIRCLE_MAX);
  cache = { key, at: now, ids: listings.map((item) => item.id) };
  return { listings, widened: false };
}

export function resetCircleCache() {
  cache = null;
}
