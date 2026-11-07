import { applyFilters, homeFeedFilters } from "./filter";
import { haversineKm, hasCoords, nearRadiusKm } from "./geo";
import { listingsForSearch, shopInScope } from "./search-browse";
import { publicShops } from "./shops";
import type { Filters, Listing, Shop } from "./types";

/** Fewer than this and a home strip renders nothing. */
export const MAGNET_BLOCK_MIN = 3;
/** Thumbs or points in one strip. */
export const MAGNET_STRIP_MAX = 10;

const BISHKEK = "Asia/Bishkek";

/** Calendar day in Asia/Bishkek, YYYY-MM-DD. */
export function bishkekDateKey(input: Date | string): string | null {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BISHKEK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Listing createdAt, exposed on the client as postedAt. Not shops.lastPostedAt. */
export function isBishkekToday(iso: string | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const key = bishkekDateKey(iso);
  const today = bishkekDateKey(now);
  return key != null && key === today;
}

/** Rounded to 0.1 km, never finer than 100 m. */
export function formatKmLabel(km: number): string {
  const rounded = Math.max(0.1, Math.round(km * 10) / 10);
  return `≈${rounded.toFixed(1).replace(".", ",")} км`;
}

export type PriceBand = "below" | "usual" | "above";

/** Below p25 / p25–p75 / above p75. Edges belong to «обычная». */
export function priceBand(price: number, p25: number, p75: number): PriceBand {
  if (price < p25) return "below";
  if (price > p75) return "above";
  return "usual";
}

export function priceStatsCategory(listing: Pick<Listing, "category">): string {
  return listing.category?.trim() ?? "";
}

export function priceStatsUnit(listing: Pick<Listing, "unit">): string {
  return listing.unit?.trim() ?? "";
}

/** Public listings in the selected region (place only, not a section chip). */
export function publicInRegion(listings: Listing[], shops: Shop[], filters: Filters, city: string): Listing[] {
  const region: Filters = {
    ...homeFeedFilters(filters),
    section: null,
    category: null,
    query: "",
    neighborOnly: false,
    priceDroppedOnly: false,
    videoOnly: false,
    sellerKind: "any",
    sort: "new",
  };
  return applyFilters(listingsForSearch(listings, shops), region, city);
}

export function neighborListings(
  listings: Listing[],
  shops: Shop[],
  lat: number,
  lng: number,
): { listing: Listing; km: number }[] {
  const radius = nearRadiusKm();
  const out: { listing: Listing; km: number }[] = [];
  for (const listing of listingsForSearch(listings, shops)) {
    if (!hasCoords(listing)) continue;
    const km = haversineKm(lat, lng, listing.lat, listing.lng);
    if (km > radius) continue;
    out.push({ listing, km });
  }
  out.sort((a, b) => a.km - b.km || (b.listing.postedAt ?? "").localeCompare(a.listing.postedAt ?? ""));
  return out;
}

export function listingsPostedToday(listings: Listing[], shops: Shop[], now = new Date()): Listing[] {
  return listingsForSearch(listings, shops).filter((item) => isBishkekToday(item.postedAt, now));
}

export function pointListingsToday(listings: Listing[], shops: Shop[], shopId: string, now = new Date()): Listing[] {
  return listingsPostedToday(listings, shops, now)
    .filter((item) => item.shopId === shopId)
    .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}

export function pointsWithListingsToday(
  listings: Listing[],
  shops: Shop[],
  filters: Filters,
  city: string,
  now = new Date(),
): { shop: Shop; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of listingsPostedToday(listings, shops, now)) {
    if (!item.shopId) continue;
    counts.set(item.shopId, (counts.get(item.shopId) ?? 0) + 1);
  }
  const rows: { shop: Shop; count: number }[] = [];
  for (const shop of publicShops(shops)) {
    if (!shopInScope(shop, filters, city)) continue;
    const count = counts.get(shop.id) ?? 0;
    if (count < 1) continue;
    rows.push({ shop, count });
  }
  rows.sort((a, b) => b.count - a.count || a.shop.name.localeCompare(b.shop.name, "ru"));
  return rows;
}
