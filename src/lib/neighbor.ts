import type { Listing } from "./types";
import { listingSellerType } from "./partners";

export type NeighborFlag = "owner" | "place" | "som" | "noPrepay";

export function neighborFlags(listing: Listing): Record<NeighborFlag, boolean> {
  const pin = listing.lat != null && listing.lng != null;
  const place =
    listing.section === "rent" || listing.section === "restaurants"
      ? pin && Boolean(listing.district || listing.city)
      : Boolean(listing.city);
  const owner = listing.noAgent && listingSellerType(listing) !== "realtor";
  return {
    owner,
    place,
    som: listing.price > 0,
    noPrepay: owner && listing.verified,
  };
}

export function isFromNeighbor(listing: Listing): boolean {
  const flags = neighborFlags(listing);
  return flags.owner && flags.place && flags.som && flags.noPrepay;
}
