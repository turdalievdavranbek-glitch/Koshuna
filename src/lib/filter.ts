import type { Filters, Listing } from "./types";

export function applyFilters(list: Listing[], filters: Filters, city: string): Listing[] {
  const cityKey = filters.city !== "all" ? filters.city : city;
  let out = list.filter((item) => {
    if (item.status === "draft") return false;
    if (cityKey && cityKey !== "all" && item.city !== cityKey) return false;
    if (filters.section && item.section !== filters.section) return false;
    if (filters.category && filters.category !== "all") {
      if (filters.section === "secondhand" || !filters.section) {
        if (item.category !== filters.category) return false;
      }
    }
    if (filters.photosOnly && !item.hasPhoto) return false;
    if (filters.verifiedOnly && !item.verified) return false;
    if (filters.noAgents && !item.noAgent) return false;
    const rentFilters = !filters.section || filters.section === "rent";
    if (rentFilters && filters.housingType && filters.housingType !== "any") {
      if (item.section !== "rent" || item.housingKind !== filters.housingType) return false;
    }
    if (rentFilters && filters.rooms.length) {
      if (!item.rooms) return false;
      const match = filters.rooms.some((r) => (r >= 4 ? item.rooms! >= 4 : item.rooms === r));
      if (!match) return false;
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
