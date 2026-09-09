import { isFromNeighbor } from "./neighbor";
import type { GoLookKind, Listing, MeetupSpot, PayAfter, ViewSlot } from "./types";

export const VIEW_SLOTS: ViewSlot[] = ["now", "today-eve", "tomorrow-am", "weekend"];

export const MEETUP_SPOTS: MeetupSpot[] = [
  "tsum",
  "philharmonic",
  "dordoi",
  "ala-too",
  "globus",
  "osh-bazaar",
  "navoi",
  "market",
  "home",
];

export const PAY_AFTER: PayAfter[] = ["cash", "mbank", "odengi", "elsom"];

export const REPORT_REASONS = ["agent", "prepay", "currency", "photos", "other"] as const;

export function hasPriceDrop(listing: Listing): boolean {
  return listing.previousPrice != null && listing.previousPrice > listing.price;
}

export function dropAmount(listing: Listing): number {
  if (!hasPriceDrop(listing) || listing.previousPrice == null) return 0;
  return listing.previousPrice - listing.price;
}

export function goLookKind(listing: Listing): GoLookKind {
  if (listing.section === "stays" || listing.dealKind === "short") return "none";
  if (listing.section === "rent" || listing.section === "cars" || listing.section === "car-rental") {
    return "view";
  }
  if (
    listing.section === "secondhand" ||
    listing.section === "animals" ||
    listing.section === "construction"
  ) {
    return "meet";
  }
  return "none";
}

export function meetupSpotsFor(city: string): MeetupSpot[] {
  if (city === "bishkek") return ["tsum", "philharmonic", "dordoi", "ala-too", "globus"];
  if (city === "osh") return ["osh-bazaar", "navoi", "home"];
  return ["market", "home"];
}

export function payAfterMethods(listing: Listing): PayAfter[] {
  if (
    listing.section === "vacancies" ||
    listing.section === "restaurants" ||
    listing.section === "services"
  ) {
    return [];
  }
  if (listing.payAfter?.length) return listing.payAfter;
  if (isFromNeighbor(listing) || listing.noAgent) return ["cash", "mbank", "odengi"];
  return [];
}

export function similarListings(listing: Listing, all: Listing[], n = 4): Listing[] {
  return all
    .filter((item) => item.id !== listing.id && item.status !== "draft")
    .map((item) => {
      let score = 0;
      if (item.section === listing.section) score += 6;
      if (item.city === listing.city) score += 3;
      if (listing.housingKind && item.housingKind === listing.housingKind) score += 2;
      if (listing.category && item.category === listing.category) score += 2;
      if (listing.dealKind && item.dealKind === listing.dealKind) score += 2;
      if (listing.goodsKind && item.goodsKind === listing.goodsKind) score += 2;
      if (isFromNeighbor(item)) score += 1;
      return { item, score };
    })
    .filter((row) => row.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((row) => row.item);
}
