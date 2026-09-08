import type { Filters, SectionId } from "./types";
import { SECTIONS } from "./data";

export function isSectionId(id: string): id is SectionId {
  return SECTIONS.some((s) => s.id === id);
}

export function patchForSection(id: SectionId, prev: Filters): Partial<Filters> {
  return {
    section: id,
    category: id === prev.section ? prev.category : null,
    rooms: id === "rent" ? prev.rooms : [],
    housingType: id === "rent" ? prev.housingType : "any",
    bodyType: id === "cars" || id === "car-rental" ? prev.bodyType : "any",
    gear: id === "car-rental" ? prev.gear : "any",
    checkIn: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkIn : null,
    checkOut: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkOut : null,
    dealType: id === "rent" ? prev.dealType : "any",
    locLng: id === "rent" ? prev.locLng : null,
    locLat: id === "rent" ? prev.locLat : null,
    locLabel: id === "rent" ? prev.locLabel : null,
  };
}
