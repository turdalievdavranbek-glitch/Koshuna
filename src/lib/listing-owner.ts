import { isOwnShop } from "./shops";
import type { AppSide, DealStage, Listing, ListingStatus, Shop, Thread, User } from "./types";

export const DEAL_STAGES: DealStage[] = ["active", "reserved", "closed", "withdrawn"];

export function isOwnListing(
  listing: { id: string; shopId?: string; shopProductId?: string },
  extra: Listing[],
  user: User | null,
  shops: Pick<Shop, "id" | "ownerPhone">[] = [],
): boolean {
  if (!user) return false;
  if (extra.some((item) => item.id === listing.id)) return true;
  if (listing.shopId) {
    const shop = shops.find((item) => item.id === listing.shopId);
    return Boolean(shop && isOwnShop(shop, user));
  }
  return false;
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
  return [...new Set(extra.map((item) => item.id))];
}

export function mineListings(all: Listing[], extra: Listing[], user: User | null, shops: Pick<Shop, "id" | "ownerPhone">[] = []): Listing[] {
  if (!user) return [];
  const seen = new Set<string>();
  return all.filter((item) => {
    if (seen.has(item.id)) return false;
    if (!isOwnListing(item, extra, user, shops)) return false;
    seen.add(item.id);
    return true;
  });
}

export function threadSide(thread: Pick<Thread, "listingId">, extra: Listing[], user: User | null): AppSide {
  if (!user) return "buy";
  return ownListingIds(extra).includes(thread.listingId) ? "sell" : "buy";
}
