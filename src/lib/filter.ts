import type { Filters, Listing } from "./types";
import { isAiylListing } from "./data";
import { haversineKm } from "./geo";
import { isFromNeighbor } from "./neighbor";

export function applyFilters(list: Listing[], filters: Filters, city: string): Listing[] {
  const cityKey = filters.city !== "all" ? filters.city : city;
  let out = list.filter((item) => {
    if (item.status === "draft") return false;
    if (cityKey && cityKey !== "all" && item.city !== cityKey) return false;
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
      if (item.animalGroup !== filters.animalGroup) return false;
      if (filters.animalKind && filters.animalKind !== "any" && item.animalKind !== filters.animalKind) {
        return false;
      }
    }
    if (filters.photosOnly && !item.hasPhoto) return false;
    if (filters.verifiedOnly && !item.verified) return false;
    if (filters.noAgents && !item.noAgent) return false;
    if (filters.neighborOnly && !isFromNeighbor(item)) return false;
    if (filters.settlement && filters.settlement !== "any") {
      if (item.settlement !== filters.settlement) return false;
    } else if (filters.aiylOnly && !isAiylListing(item)) {
      return false;
    }
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
