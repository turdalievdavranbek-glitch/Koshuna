import type { Listing } from "./types";

/** Where the owner edits a listing. Point products are edited with the point; the rest reuse the post form. */
export function listingEditHref(listing: Pick<Listing, "section" | "shopId" | "sellerType">): string {
  if (listing.shopId) return `/shops/${listing.shopId}/edit`;
  if (listing.section === "services") return "/post?card=service&edit=1";
  if (listing.section === "restaurants") return "/post?card=cafe&edit=1";
  if ((listing.section === "cars" || listing.section === "car-rental") && listing.sellerType === "dealer") return "/post?card=dealer&edit=1";
  return "/post?type=personal&edit=1";
}
