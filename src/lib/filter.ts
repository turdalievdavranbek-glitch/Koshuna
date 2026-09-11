import type { Filters, Listing } from "./types";
import { isAiylListing } from "./data";
import { hasPriceDrop } from "./deal";
import { haversineKm } from "./geo";
import { isFromNeighbor } from "./neighbor";
import { oblastOfListing } from "./places";
import { isSpokenListing } from "./video-ai";

/** Home chips only — leftover section search (rooms, map pin, deal type) must not empty the feed. */
export function homeFeedFilters(filters: Filters): Filters {
  return {
    ...filters,
    section: null,
    category: null,
    goodsKind: "any",
    housingType: "any",
    rooms: [],
    bodyType: "any",
    gear: "any",
    photosOnly: false,
    verifiedOnly: false,
    noAgents: false,
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
    checkIn: null,
    checkOut: null,
  };
}

function placeMatches(item: Listing, filters: Filters, city: string): boolean {
  if (filters.settlement && filters.settlement !== "any") return item.settlement === filters.settlement;
  if (filters.aiylOnly) return isAiylListing(item);
  const cityKey = filters.city !== "all" ? filters.city : city;
  if (cityKey && cityKey !== "all") return item.city === cityKey;
  if (filters.oblast && filters.oblast !== "any") return oblastOfListing(item) === filters.oblast;
  return true;
}

export function applyFilters(list: Listing[], filters: Filters, city: string): Listing[] {
  let out = list.filter((item) => {
    if (item.status === "draft" || item.status === "withdrawn" || item.status === "closed") return false;
    if (!placeMatches(item, filters, city)) return false;
    if (filters.section === "cars") {
      const want = filters.autoType === "rent" ? "car-rental" : "cars";
      if (item.section !== want) return false;
    } else if (filters.section && item.section !== filters.section) {
      return false;
    }
    if (filters.category && filters.category !== "all") {
      if (
        (filters.section === "secondhand" ||
          filters.section === "services" ||
          filters.section === "construction" ||
          filters.section === "restaurants") &&
        item.category !== filters.category
      ) {
        return false;
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
    if (filters.priceDroppedOnly && !hasPriceDrop(item)) return false;
    if (filters.videoOnly && !isSpokenListing(item)) return false;
    if (filters.section === "rent" && filters.dealType && filters.dealType !== "any") {
      if (item.dealKind !== filters.dealType) return false;
    }
    if (filters.section === "rent" && filters.stockType && filters.stockType !== "any") {
      if (item.dealKind !== "buy" || item.stockKind !== filters.stockType) return false;
    }
    if (
      !filters.aiylOnly &&
      (!filters.settlement || filters.settlement === "any") &&
      (filters.section === "rent" || filters.section === "restaurants") &&
      filters.locLng != null &&
      filters.locLat != null &&
      item.lng != null &&
      item.lat != null
    ) {
      if (haversineKm(filters.locLat, filters.locLng, item.lat, item.lng) > 6) return false;
    }
    const rentFilters = filters.section === "rent";
    if (rentFilters && filters.housingType && filters.housingType !== "any") {
      if (item.section !== "rent" || item.housingKind !== filters.housingType) return false;
    }
    if (rentFilters && filters.rooms.length) {
      if (!item.rooms) return false;
      const match = filters.rooms.some((r) => (r >= 4 ? item.rooms! >= 4 : item.rooms === r));
      if (!match) return false;
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
    if (filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      const blob = `${item.title} ${item.titleEn} ${item.titleKy} ${item.description}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  if (filters.sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
  else if (filters.sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
  return out;
}
