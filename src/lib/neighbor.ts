import type { Listing, SectionId } from "./types";
import { listingSellerType } from "./partners";

export function showsNeighborPledge(section: SectionId | null | undefined): boolean {
  return section === "secondhand";
}

/** Detail blocks: pay-after-meet, neighbor checklist, go-look, owner voice. */
export function showsPersonalNeighborBlocks(listing: Pick<Listing, "section" | "shopId" | "shopProductId" | "sellerType" | "dealerId">): boolean {
  if (listing.section !== "secondhand") return false;
  if (listing.shopId || listing.shopProductId) return false;
  if (listing.sellerType === "realtor" || listing.sellerType === "dealer") return false;
  if (listing.dealerId) return false;
  return true;
}

export type NeighborFlag = "owner" | "place" | "som" | "noPrepay";

export function neighborFlags(listing: Listing): Record<NeighborFlag, boolean> {
  const pin = listing.lat != null && listing.lng != null;
  const place =
    listing.section === "rent" || listing.section === "restaurants"
      ? pin && Boolean(listing.district || listing.city)
      : Boolean(listing.city);
  const owner = listing.noAgent && listingSellerType(listing) === "owner";
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
