import type { Filters, SectionId } from "./types";
import { SECTIONS } from "./data";

export function isSectionId(id: string): id is SectionId {
  return SECTIONS.some((s) => s.id === id);
}

export function patchForSection(id: SectionId, prev: Filters): Partial<Filters> {
  const stayingOnCars = id === "cars" && prev.section === "cars";
  return {
    section: id,
    category: id === prev.section ? prev.category : null,
    goodsKind: id === "secondhand" && id === prev.section ? prev.goodsKind : "any",
    techBrand: id === "secondhand" && id === prev.section ? prev.techBrand : "any",
    techModel: id === "secondhand" && id === prev.section ? prev.techModel : "any",
    rooms: id === "rent" ? prev.rooms : [],
    housingType: id === "rent" ? prev.housingType : "any",
    bodyType: id === "cars" ? prev.bodyType : "any",
    carMake: id === "cars" && stayingOnCars ? prev.carMake : "any",
    carModel: id === "cars" && stayingOnCars ? prev.carModel : "any",
    gear: stayingOnCars && prev.autoType === "rent" ? prev.gear : "any",
    autoType: id === "cars" ? (stayingOnCars ? prev.autoType : "sale") : "sale",
    animalGroup: id === "animals" ? (prev.section === "animals" ? prev.animalGroup : "pets") : "pets",
    animalKind: id === "animals" && prev.section === "animals" ? prev.animalKind : "any",
    checkIn: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkIn : null,
    checkOut: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkOut : null,
    dealType: id === "rent" ? prev.dealType : "any",
    stockType: id === "rent" ? prev.stockType : "any",
    locLng: id === "rent" ? prev.locLng : null,
    locLat: id === "rent" ? prev.locLat : null,
    locLabel: id === "rent" ? prev.locLabel : null,
  };
}
