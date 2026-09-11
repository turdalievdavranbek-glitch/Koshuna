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
    bodyType: id === "cars" && stayingOnCars ? prev.bodyType : "any",
    vehicleGroup: id === "cars" && stayingOnCars ? prev.vehicleGroup : "any",
    carMake: id === "cars" && stayingOnCars ? prev.carMake : "any",
    carModel: id === "cars" && stayingOnCars ? prev.carModel : "any",
    gear: stayingOnCars && prev.autoType === "rent" ? prev.gear : "any",
    autoType: id === "cars" ? (stayingOnCars ? prev.autoType : "sale") : "sale",
    animalGroup:
      id === "animals" ? (prev.section === "animals" ? prev.animalGroup : "any") : "any",
    animalKind: id === "animals" && prev.section === "animals" ? prev.animalKind : "any",
    jobSphere: id === "vacancies" && prev.section === "vacancies" ? prev.jobSphere : "any",
    jobSub: id === "vacancies" && prev.section === "vacancies" ? prev.jobSub : "any",
    jobRole: id === "vacancies" && prev.section === "vacancies" ? prev.jobRole : "any",
    jobType: id === "vacancies" && prev.section === "vacancies" ? prev.jobType : "any",
    checkIn: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkIn : null,
    checkOut: id === "stays" || (id === "rent" && prev.dealType === "short") ? prev.checkOut : null,
    dealType: id === "rent" ? prev.dealType : "any",
    stockType: id === "rent" ? prev.stockType : "any",
    locLng: prev.locLng,
    locLat: prev.locLat,
    locLabel: prev.locLabel,
    settlement: prev.settlement,
    oblast: prev.oblast,
    aiylOnly: prev.aiylOnly,
  };
}
