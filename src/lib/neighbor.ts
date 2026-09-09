import type { Listing } from "./types";

export type NeighborFlag = "owner" | "place" | "som" | "noPrepay";

export function neighborFlags(listing: Listing): Record<NeighborFlag, boolean> {
  const pin = listing.lat != null && listing.lng != null;
  const place =
    listing.section === "rent" || listing.section === "restaurants"
      ? pin && Boolean(listing.district || listing.city)
      : Boolean(listing.city);
  return {
    owner: listing.noAgent,
    place,
    som: listing.price > 0,
    noPrepay: listing.noAgent && listing.verified,
  };
}

export function isFromNeighbor(listing: Listing): boolean {
  const flags = neighborFlags(listing);
  return flags.owner && flags.place && flags.som && flags.noPrepay;
}
