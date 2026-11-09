import { sanitizeShopHours } from "@/lib/shops";
import type { Listing } from "@/lib/types";

/** Keep service fields inside their enums. Invalid hours, mode and area are dropped. */
export function sanitizeServiceListing(listing: Listing): Listing {
  if (listing.section !== "services") return listing;
  const serviceMode = listing.serviceMode === "place" || listing.serviceMode === "mobile" ? listing.serviceMode : undefined;
  const serviceArea = listing.serviceArea === "district" || listing.serviceArea === "city" ? listing.serviceArea : undefined;
  const next: Listing = {
    ...listing,
    serviceMode,
    serviceArea: serviceMode === "mobile" ? serviceArea : undefined,
    priceFrom: listing.priceFrom === true,
    hours: sanitizeShopHours(listing.hours),
  };
  if (serviceMode === "mobile") {
    next.lat = undefined;
    next.lng = undefined;
    next.address = undefined;
  }
  return next;
}
