import type { Filters, Listing } from "./types";
import { isAiylListing, serviceCategoryMatches } from "./data";
import { listingTextHit } from "./catalog-words";
import { hasPriceDrop } from "./deal";
import { haversineKm, hasCoords, nearRadiusKm } from "./geo";
import { isFromNeighbor } from "./neighbor";
import { adminAreaById, adminAreaMatchesListing } from "./admin-areas";
import { listingInOblast } from "./places";
import { isShopCategory, isShopKind, parentOfShopKind } from "./shops";
import { listingMatchesRealty, listingRoomsMatch } from "./realty";
import { isSpokenListing } from "./video-ai";

/** Home «Свежее» list: apply section/category chips, keep place, drop leftover map-pin / price-range. */
export function homeFeedFilters(filters: Filters): Filters {
  const section = filters.section;
  return {
    ...filters,
    photosOnly: false,
    verifiedOnly: false,
    noAgents: false,
    locLng: null,
    locLat: null,
    locLabel: null,
    priceMin: null,
    priceMax: null,
    rooms: section === "rent" ? filters.rooms : [],
    housingType: section === "rent" ? filters.housingType : "any",
    realtyGroup: section === "rent" ? filters.realtyGroup : "any",
    realtySub: section === "rent" ? filters.realtySub : "any",
    realtyKind: section === "rent" ? filters.realtyKind : "any",
    dealType: section === "rent" ? filters.dealType : "any",
    stockType: section === "rent" ? filters.stockType : "any",
    areaMin: section === "rent" ? filters.areaMin : null,
    areaMax: section === "rent" ? filters.areaMax : null,
    checkIn: section === "stays" ? filters.checkIn : null,
    checkOut: section === "stays" ? filters.checkOut : null,
    bodyType: section === "cars" ? filters.bodyType : "any",
    gear: section === "cars" ? filters.gear : "any",
    autoType: section === "cars" ? filters.autoType : "sale",
    carMake: section === "cars" ? filters.carMake : "any",
    carModel: section === "cars" ? filters.carModel : "any",
    vehicleGroup: section === "cars" ? filters.vehicleGroup : "any",
    goodsKind: section === "secondhand" ? filters.goodsKind : "any",
    techBrand: section === "secondhand" ? filters.techBrand : "any",
    techModel: section === "secondhand" ? filters.techModel : "any",
    animalGroup: section === "animals" ? filters.animalGroup : "any",
    animalKind: section === "animals" ? filters.animalKind : "any",
    jobSphere: section === "vacancies" ? filters.jobSphere : "any",
    jobSub: section === "vacancies" ? filters.jobSub : "any",
    jobRole: section === "vacancies" ? filters.jobRole : "any",
    jobType: section === "vacancies" ? filters.jobType : "any",
    sellerKind: section === "rent" || section === "cars" ? filters.sellerKind : "any",
  };
}

export function clearFreshListPatch(filters: Filters): Partial<Filters> {
  return {
    section: null,
    category: null,
    goodsKind: "any",
    housingType: "any",
    realtyGroup: "any",
    realtySub: "any",
    realtyKind: "any",
    rooms: [],
    bodyType: "any",
    gear: "any",
    neighborOnly: false,
    sellerKind: "any",
    videoOnly: false,
    sort: "new",
    checkIn: null,
    checkOut: null,
    dealType: "any",
    stockType: "any",
    autoType: "sale",
    carMake: "any",
    carModel: "any",
    vehicleGroup: "any",
    techBrand: "any",
    techModel: "any",
    animalGroup: "any",
    animalKind: "any",
    jobSphere: "any",
    jobSub: "any",
    jobRole: "any",
    jobType: "any",
    locLng: null,
    locLat: null,
    locLabel: null,
    priceMin: null,
    priceMax: null,
    areaMin: null,
    areaMax: null,
    priceDroppedOnly: false,
    city: filters.city,
    oblast: filters.oblast,
    settlement: filters.settlement,
    rayon: filters.rayon,
    aiylOnly: filters.aiylOnly,
    query: filters.query,
    scope:
      (filters.rayon && filters.rayon !== "any") ||
      (filters.settlement && filters.settlement !== "any") ||
      (filters.oblast && filters.oblast !== "any") ||
      (filters.city && filters.city !== "all")
        ? "area"
        : "all",
  };
}

export function hasPlaceFilter(filters: Pick<Filters, "city" | "oblast" | "settlement" | "locLabel" | "rayon">): boolean {
  if (filters.rayon && filters.rayon !== "any") return true;
  if (filters.settlement && filters.settlement !== "any") return true;
  if (filters.oblast && filters.oblast !== "any") return true;
  if (filters.city && filters.city !== "all") return true;
  if (filters.locLabel) return true;
  return false;
}

/** «Рядом» is the phone. A district or map pin in locLat is not a shortcut. */
export function nearDecision(filters: Pick<Filters, "scope" | "nearLat">): "keep" | "locate" {
  if (filters.scope === "near" && filters.nearLat != null) return "keep";
  return "locate";
}

export function nearPatch(res: { lat: number; lng: number }): Pick<Filters, "nearLat" | "nearLng" | "scope"> {
  return { nearLat: res.lat, nearLng: res.lng, scope: "near" };
}

/** A map point, district chip, search hit, or deep link is «Мой район». */
export function mapPointFilters(patch: {
  section: Filters["section"];
  autoType?: Filters["autoType"];
  locLat: number | null;
  locLng: number | null;
  locLabel: string | null;
}): Partial<Filters> {
  return { ...patch, scope: "area" };
}

export function clearMapPoint(filters: Filters): Partial<Filters> {
  const next = { ...filters, locLat: null, locLng: null, locLabel: null };
  return {
    locLat: null,
    locLng: null,
    locLabel: null,
    scope: hasPlaceFilter(next) ? "area" : "all",
  };
}

/** Old saved filters have no scope. A phone fix → near; a picked pin or place → area; otherwise all. An explicit scope is kept. */
export function scopeForSaved(filters: {
  scope?: string | null;
  locLat?: number | null;
  locLng?: number | null;
  nearLat?: number | null;
  nearLng?: number | null;
  locLabel?: string | null;
  settlement?: string | null;
  city?: string | null;
  oblast?: string | null;
  rayon?: string | null;
}): "near" | "area" | "all" {
  if (filters.scope === "near" || filters.scope === "area" || filters.scope === "all") return filters.scope;
  if (filters.nearLat != null) return "near";
  if (filters.locLat != null) return "area";
  if (
    (filters.rayon && filters.rayon !== "any") ||
    (filters.settlement && filters.settlement !== "any") ||
    filters.locLabel ||
    (filters.city && filters.city !== "all") ||
    (filters.oblast && filters.oblast !== "any")
  ) {
    return "area";
  }
  return "all";
}

function placeMatches(item: Listing, filters: Filters, city: string): boolean {
  if (filters.rayon && filters.rayon !== "any") {
    const area = adminAreaById(filters.rayon);
    if (area) return adminAreaMatchesListing(area, item);
  }
  if (filters.settlement && filters.settlement !== "any") return item.settlement === filters.settlement;
  if (filters.aiylOnly) return isAiylListing(item);
  const cityKey = filters.city !== "all" ? filters.city : city;
  if (cityKey && cityKey !== "all") return item.city === cityKey;
  if (filters.oblast && filters.oblast !== "any") return listingInOblast(item, filters.oblast);
  return true;
}

export function applyFilters(list: Listing[], filters: Filters, city: string): Listing[] {
  let out = list.filter((item) => {
    if (item.underReview) return false;
    if (item.status === "draft" || item.status === "withdrawn" || item.status === "closed" || item.status === "hidden") return false;
    if (filters.scope === "near") {
      if (filters.nearLat == null || filters.nearLng == null || !hasCoords(item)) return false;
      if (haversineKm(filters.nearLat, filters.nearLng, item.lat, item.lng) > nearRadiusKm()) return false;
    } else if (filters.scope !== "all") {
      if (!placeMatches(item, filters, city)) return false;
    }
    if (filters.section === "cars") {
      const want = filters.autoType === "rent" ? "car-rental" : "cars";
      if (item.section !== want) return false;
    } else if (filters.section && item.section !== filters.section) {
      return false;
    }
    if (filters.category && filters.category !== "all") {
      if (filters.section === "services") {
        if (!serviceCategoryMatches(item.category, filters.category)) return false;
      } else if (
        (filters.section === "secondhand" ||
          filters.section === "construction" ||
          filters.section === "restaurants") &&
        item.category !== filters.category
      ) {
        return false;
      }
      if (filters.section === "shops") {
        const want = filters.category;
        const listingParent = isShopKind(item.category) ? parentOfShopKind(item.category) : item.category;
        if (isShopKind(want)) {
          if (item.category !== want && listingParent !== parentOfShopKind(want)) return false;
        } else if (isShopCategory(want)) {
          if (item.category !== want && listingParent !== want) return false;
        }
      }
    }
    if (filters.section === "secondhand" && filters.goodsKind && filters.goodsKind !== "any") {
      if (item.goodsKind !== filters.goodsKind) return false;
    }
    if (filters.section === "secondhand" && filters.techBrand && filters.techBrand !== "any") {
      if (item.techBrand !== filters.techBrand) return false;
    }
    if (filters.section === "secondhand" && filters.techModel && filters.techModel !== "any") {
      if (item.techModel !== filters.techModel) return false;
    }
    if (filters.section === "animals") {
      if (filters.animalGroup && filters.animalGroup !== "any" && item.animalGroup !== filters.animalGroup) {
        return false;
      }
      if (filters.animalKind && filters.animalKind !== "any" && item.animalKind !== filters.animalKind) {
        return false;
      }
    }
    if (filters.photosOnly && !item.hasPhoto) return false;
    if (filters.verifiedOnly && !item.verified) return false;
    if (filters.noAgents && !item.noAgent) return false;
    if (filters.neighborOnly && !isFromNeighbor(item)) return false;
    if (filters.sellerKind === "neighbor" && !isFromNeighbor(item)) return false;
    if (filters.sellerKind === "owner" && item.sellerType !== "owner" && item.sellerType) return false;
    if (filters.sellerKind === "realtor" && item.sellerType !== "realtor") return false;
    if (filters.sellerKind === "private" && item.sellerType === "dealer") return false;
    if (filters.sellerKind === "dealer" && item.sellerType !== "dealer") return false;
    if (filters.priceDroppedOnly && !hasPriceDrop(item)) return false;
    if (filters.videoOnly && !isSpokenListing(item)) return false;
    if (filters.section === "rent" && filters.dealType && filters.dealType !== "any") {
      if (item.dealKind !== filters.dealType) return false;
    }
    if (filters.section === "rent" && filters.stockType && filters.stockType !== "any") {
      if (item.dealKind !== "buy" || item.stockKind !== filters.stockType) return false;
    }
    const rentFilters = filters.section === "rent";
    if (rentFilters && !listingMatchesRealty(item, filters)) return false;
    if (
      rentFilters &&
      (!filters.realtyGroup || filters.realtyGroup === "any") &&
      filters.housingType &&
      filters.housingType !== "any"
    ) {
      if (item.section !== "rent" || item.housingKind !== filters.housingType) return false;
    }
    if (rentFilters && filters.rooms.length) {
      const match = filters.rooms.some((r) => listingRoomsMatch(item.rooms, r));
      if (!match) return false;
    }
    if (rentFilters && filters.areaMin != null) {
      if (item.area == null || item.area < filters.areaMin) return false;
    }
    if (rentFilters && filters.areaMax != null) {
      if (item.area == null || item.area > filters.areaMax) return false;
    }
    const carFilters = filters.section === "cars";
    if (carFilters && filters.vehicleGroup && filters.vehicleGroup !== "any") {
      const group = item.vehicleGroup === "special" ? "special" : "passenger";
      if (group !== filters.vehicleGroup) return false;
    }
    if (carFilters && filters.carMake && filters.carMake !== "any") {
      if (item.carMake !== filters.carMake) return false;
    }
    if (carFilters && filters.carModel && filters.carModel !== "any") {
      if (item.carModel !== filters.carModel) return false;
    }
    if (carFilters && filters.bodyType && filters.bodyType !== "any") {
      if (item.bodyKind !== filters.bodyType) return false;
    }
    if (carFilters && filters.autoType === "rent" && filters.gear && filters.gear !== "any") {
      if (item.gearKind !== filters.gear) return false;
    }
    if (filters.section === "vacancies") {
      if (filters.jobSphere && filters.jobSphere !== "any" && item.jobSphere !== filters.jobSphere) return false;
      if (filters.jobSub && filters.jobSub !== "any" && item.jobSub !== filters.jobSub) return false;
      if (filters.jobRole && filters.jobRole !== "any" && item.jobRole !== filters.jobRole) return false;
      if (filters.jobType && filters.jobType !== "any" && item.jobType !== filters.jobType) return false;
    }
    if (filters.priceMin != null && item.price < filters.priceMin) return false;
    if (filters.priceMax != null && item.price > filters.priceMax) return false;
    if (filters.query.trim() && !listingTextHit(item, filters.query)) return false;
    return true;
  });

  if (filters.sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
  else if (filters.sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
  return out;
}
