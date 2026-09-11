import type { ListingReaction } from "./types";

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

export function socialCounts(
  id: string,
  reaction: ListingReaction | null | undefined,
  commentCount: number,
) {
  return {
    likes: baseLikes(id) + (reaction === "like" ? 1 : 0),
    dislikes: baseDislikes(id) + (reaction === "dislike" ? 1 : 0),
    comments: commentCount,
  };
}
