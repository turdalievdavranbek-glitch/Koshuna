import type { Listing } from "./types";

/** «Ещё актуально?» appears after this many days without a «Да». */
export const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const LIVE = new Set(["active", "promoted"]);

export function listingNeedsRefresh(
  listing: Pick<Listing, "status" | "confirmedAt" | "postedAt">,
  now = Date.now(),
): boolean {
  if (!LIVE.has(listing.status)) return false;
  const iso = listing.confirmedAt || listing.postedAt;
  if (!iso) return false;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return false;
  return now - at > STALE_AFTER_MS;
}
