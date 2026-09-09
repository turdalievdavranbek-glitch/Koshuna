import type { DraftListing, Listing } from "./types";

export type MarketScope = "tight" | "city" | "section";

export type MarketBand = {
  min: number;
  max: number;
  typical: number;
  count: number;
  scope: MarketScope;
};

export type MarketFit = "low" | "in" | "high";

export function parseDraftPrice(raw: string): number {
  return Number(String(raw).replace(/\s/g, "")) || 0;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function sameSection(draft: DraftListing, item: Listing): boolean {
  return item.section === draft.section;
}

function rentLike(item: Listing): boolean {
  if (item.dealKind === "buy" || item.dealKind === "short") return false;
  if (item.unit === "day" || item.unit === "night") return false;
  return true;
}

function eligible(draft: DraftListing, item: Listing): boolean {
  if (item.status === "draft") return false;
  if (!sameSection(draft, item)) return false;
  if (!item.price || item.price <= 0) return false;
  if (draft.section === "rent" && draft.kind === "rent" && !rentLike(item)) return false;
  return true;
}

function tightEnough(draft: DraftListing, item: Listing): boolean {
  if (item.city !== draft.city) return false;
  if (draft.section === "rent") {
    if (draft.housingKind && item.housingKind && item.housingKind !== draft.housingKind) return false;
    const rooms = Number(draft.rooms);
    if (rooms && item.rooms && item.rooms !== rooms) return false;
  }
  if (draft.section === "secondhand") {
    if (draft.category && item.category && item.category !== draft.category) return false;
    if (draft.goodsKind && item.goodsKind && item.goodsKind !== draft.goodsKind) return false;
    if (draft.techBrand && item.techBrand && item.techBrand !== draft.techBrand) return false;
  }
  if (draft.section === "cars" || draft.section === "car-rental") {
    if (draft.carMake && item.carMake && item.carMake !== draft.carMake) return false;
  }
  if (draft.section === "animals") {
    if (draft.animalGroup && item.animalGroup && item.animalGroup !== draft.animalGroup) return false;
    if (draft.animalKind && item.animalKind && item.animalKind !== draft.animalKind) return false;
  }
  if (
    (draft.section === "services" || draft.section === "construction" || draft.section === "restaurants") &&
    draft.category &&
    item.category &&
    item.category !== draft.category
  ) {
    return false;
  }
  return true;
}

function cityEnough(draft: DraftListing, item: Listing): boolean {
  return item.city === draft.city;
}

function bandFrom(items: Listing[], scope: MarketScope): MarketBand | null {
  if (items.length < 2) return null;
  const prices = items.map((item) => item.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    typical: median(prices),
    count: items.length,
    scope,
  };
}

export function marketBand(draft: DraftListing, listings: Listing[]): MarketBand | null {
  const pool = listings.filter((item) => eligible(draft, item));
  return (
    bandFrom(
      pool.filter((item) => tightEnough(draft, item)),
      "tight",
    ) ??
    bandFrom(
      pool.filter((item) => cityEnough(draft, item)),
      "city",
    ) ??
    bandFrom(pool, "section")
  );
}

export function marketFit(price: number, band: MarketBand): MarketFit {
  if (price > 0 && price < band.min) return "low";
  if (price > band.max) return "high";
  return "in";
}

export function marketMarker(price: number, band: MarketBand): number {
  if (band.max <= band.min) return 50;
  const t = (price - band.min) / (band.max - band.min);
  return Math.min(100, Math.max(0, t * 100));
}
