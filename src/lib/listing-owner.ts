import { MY_LISTING_IDS } from "./data";
import type { DealStage, Listing, ListingStatus, User } from "./types";

export const DEAL_STAGES: DealStage[] = ["active", "reserved", "closed", "withdrawn"];

export function isOwnListing(listing: Listing, extra: Listing[], user: User | null): boolean {
  if (!user) return false;
  if (extra.some((item) => item.id === listing.id)) return true;
  return MY_LISTING_IDS.includes(listing.id);
}

export function isOffMarket(listing: Pick<Listing, "status">): boolean {
  return listing.status === "draft" || listing.status === "withdrawn" || listing.status === "closed";
}

export function stageOf(listing: Pick<Listing, "status">): DealStage {
  if (listing.status === "reserved" || listing.status === "closed" || listing.status === "withdrawn") {
    return listing.status;
  }
  return "active";
}

export function statusForStage(listing: Listing, stage: DealStage): ListingStatus {
  if (stage === "active") return listing.status === "promoted" ? "promoted" : "active";
  return stage;
}

export function ownListingIds(extra: Listing[]): string[] {
  return [...new Set([...extra.map((item) => item.id), ...MY_LISTING_IDS])];
}
