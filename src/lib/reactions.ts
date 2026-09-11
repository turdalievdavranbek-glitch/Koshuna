import type { ListingReaction, User } from "./types";

export type ReactionsByVoter = Record<string, Record<string, ListingReaction>>;

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Stable, seeded base counts so sample listings feel alive without a backend.
export function baseLikes(id: string): number {
  return 4 + (hash(id) % 46);
}

export function baseDislikes(id: string): number {
  return hash(`${id}:d`) % 5;
}

export function isListingReaction(value: unknown): value is ListingReaction {
  return value === "like" || value === "dislike";
}

export function voterId(user: User | null | undefined): string | null {
  if (!user) return null;
  const phone = user.phone?.replace(/\D/g, "");
  if (phone) return `p:${phone}`;
  const email = user.email?.trim().toLowerCase();
  if (email) return `e:${email}`;
  const name = user.name?.trim();
  return name ? `n:${name}` : null;
}

export function hydrateReactions(raw: unknown, user: User | null | undefined): ReactionsByVoter {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const entries = Object.entries(rec);
  if (!entries.length) return {};

  const nested = entries.every(([, value]) => {
    if (isListingReaction(value) || value == null || Array.isArray(value)) return false;
    return typeof value === "object";
  });

  if (nested) {
    const out: ReactionsByVoter = {};
    for (const [voter, map] of entries) {
      if (!map || typeof map !== "object" || Array.isArray(map)) continue;
      const inner: Record<string, ListingReaction> = {};
      for (const [listingId, reaction] of Object.entries(map as Record<string, unknown>)) {
        if (isListingReaction(reaction)) inner[listingId] = reaction;
      }
      if (Object.keys(inner).length) out[voter] = inner;
    }
    return out;
  }

  const flat: Record<string, ListingReaction> = {};
  for (const [listingId, reaction] of entries) {
    if (isListingReaction(reaction)) flat[listingId] = reaction;
  }
  const vid = voterId(user);
  if (!vid || !Object.keys(flat).length) return {};
  return { [vid]: flat };
}

export function socialCounts(id: string, reactions: ReactionsByVoter, commentCount: number) {
  let extraLikes = 0;
  let extraDislikes = 0;
  for (const map of Object.values(reactions)) {
    if (map[id] === "like") extraLikes += 1;
    else if (map[id] === "dislike") extraDislikes += 1;
  }
  return {
    likes: baseLikes(id) + extraLikes,
    dislikes: baseDislikes(id) + extraDislikes,
    comments: commentCount,
  };
}
