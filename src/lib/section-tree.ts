import {
  ANIMAL_GROUPS,
  CATEGORIES,
  CONSTRUCTION_CATEGORIES,
  PROPERTY_TYPES,
  RESTAURANT_CATEGORIES,
  SERVICE_CATEGORIES,
  animalKindsOf,
  goodsKindsOf,
  isTechCategory,
  techBrandsOf,
  techModelsOf,
} from "./data";
import {
  VEHICLE_GROUPS,
  isVehicleGroup,
  vehicleMakesOf,
  vehicleModelsOf,
  vehicleTypesOf,
} from "./transport";
import { JOB_SPHERES, isJobSphere, jobRolesOf, jobSubsOf } from "./vacancies";
import {
  REALTY_GROUPS,
  housingKindOfRealty,
  housingTypeToRealtyGroup,
  isRealtyGroup,
  realtyKindsOf,
  realtySubsOf,
  roomsOfRealtyKind,
  stockOfRealtyKind,
} from "./realty";
import type { Dict } from "./i18n";
import { isSectionId } from "./section";
import type { AnimalGroup, Filters, SectionId } from "./types";
import { isShopCategory, isShopKind, parentOfShopKind } from "./shops";

export const BRANCH_ALL = "all";

export type BranchOption = {
  id: string;
  label: (t: Dict) => string;
  hasChildren: boolean;
};

export type BranchState = {
  ok: true;
  title: (t: Dict) => string;
  parentPath: string[];
  options: BranchOption[];
  patch: Partial<Filters>;
  isPicker: boolean;
  showFeed: boolean;
  eyebrow: (t: Dict) => string;
};

function option(id: string, label: (t: Dict) => string, hasChildren: boolean): BranchOption {
  return { id, label, hasChildren };
}

function inList(id: string, list: readonly string[]) {
  return list.includes(id);
}

export function parseBranch(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((part) => decodeURIComponent(part)).filter(Boolean);
}

export function sectionHref(id: SectionId, path: string[] = []) {
  if (!path.length) return `/section/${id}`;
  return `/section/${id}/c/${path.map(encodeURIComponent).join("/")}`;
}

function secondhand(path: string[]): BranchState | null {
  const base: Partial<Filters> = {
    section: "secondhand",
    category: null,
    goodsKind: "any",
    techBrand: "any",
    techModel: "any",
  };
  const cats = CATEGORIES.map((c) => option(c, (t) => t.cats[c], goodsKindsOf(c).length > 0));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.secondhand,
      parentPath: [],
      options: cats,
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.category,
    };
  }

  const cat = path[0];
  if (!inList(cat, CATEGORIES)) return null;
  const kinds = goodsKindsOf(cat);
  const catPatch: Partial<Filters> = { ...base, category: cat };
  const kindOptions = kinds.map((id) =>
    option(id, (t) => t.goodsKinds[id], isTechCategory(cat) && techBrandsOf(cat).length > 0),
  );

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => t.cats[cat],
      parentPath: [],
      options: kindOptions,
      patch: catPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => (isTechCategory(cat) ? t.equipmentType : t.itemType),
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.cats[cat],
      parentPath: [cat],
      options: [],
      patch: catPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.category,
    };
  }

  const kind = path[1];
  if (!inList(kind, kinds)) return null;
  const kindPatch: Partial<Filters> = { ...catPatch, goodsKind: kind };

  if (!isTechCategory(cat)) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.goodsKinds[kind],
      parentPath: [cat],
      options: [],
      patch: kindPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.itemType,
    };
  }

  const brands = techBrandsOf(cat);
  const brandOptions = brands.map((id) =>
    option(id, (t) => t.techBrands[id], techModelsOf(cat, id).length > 0),
  );

  if (path.length === 2) {
    return {
      ok: true,
      title: (t) => t.goodsKinds[kind],
      parentPath: [cat],
      options: brandOptions,
      patch: kindPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.carMake,
    };
  }

  if (path[2] === BRANCH_ALL) {
    if (path.length !== 3) return null;
    return {
      ok: true,
      title: (t) => t.goodsKinds[kind],
      parentPath: [cat, kind],
      options: [],
      patch: kindPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.equipmentType,
    };
  }

  const brand = path[2];
  if (!inList(brand, brands)) return null;
  const brandPatch: Partial<Filters> = { ...kindPatch, techBrand: brand };
  const models = techModelsOf(cat, brand);
  const modelOptions = models.map((id) => option(id, (t) => t.techModels[id], false));

  if (path.length === 3) {
    return {
      ok: true,
      title: (t) => t.techBrands[brand] ?? brand,
      parentPath: [cat, kind],
      options: modelOptions,
      patch: brandPatch,
      isPicker: modelOptions.length > 0,
      showFeed: modelOptions.length === 0,
      eyebrow: (t) => t.carModel,
    };
  }

  if (path[3] === BRANCH_ALL) {
    if (path.length !== 4) return null;
    return {
      ok: true,
      title: (t) => t.techBrands[brand] ?? brand,
      parentPath: [cat, kind, brand],
      options: [],
      patch: brandPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.carMake,
    };
  }

  const model = path[3];
  if (path.length !== 4 || !inList(model, models)) return null;
  return {
    ok: true,
    title: (t) => t.techModels[model] ?? model,
    parentPath: [cat, kind, brand],
    options: [],
    patch: { ...brandPatch, techModel: model },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.carModel,
  };
}

function cars(path: string[]): BranchState | null {
  const base: Partial<Filters> = {
    section: "cars",
    vehicleGroup: "any",
    bodyType: "any",
    carMake: "any",
    carModel: "any",
  };
  const groups = VEHICLE_GROUPS.map((id) => option(id, (t) => t.vehicleGroups[id], true));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.cars,
      parentPath: [],
      options: groups,
      patch: base,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.category,
    };
  }

  if (path[0] === BRANCH_ALL) {
    if (path.length !== 1) return null;
    return {
      ok: true,
      title: (t) => t.sectionNames.cars,
      parentPath: [],
      options: [],
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.category,
    };
  }

  const group = path[0];
  if (!isVehicleGroup(group)) return null;
  const types = vehicleTypesOf(group);
  const groupPatch: Partial<Filters> = { ...base, vehicleGroup: group };
  const typeEyebrow = (t: Dict) => (group === "special" ? t.vehicleType : t.bodyType);

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => t.vehicleGroups[group],
      parentPath: [],
      options: types.map((id) => option(id, (t) => t.vehicleTypes[id], vehicleMakesOf(group, id).length > 0)),
      patch: groupPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: typeEyebrow,
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.vehicleGroups[group],
      parentPath: [group],
      options: [],
      patch: groupPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: typeEyebrow,
    };
  }

  const type = path[1];
  if (!types.includes(type)) return null;
  const makes = vehicleMakesOf(group, type);
  const typePatch: Partial<Filters> = { ...groupPatch, bodyType: type };

  if (path.length === 2) {
    return {
      ok: true,
      title: (t) => t.vehicleTypes[type] ?? type,
      parentPath: [group],
      options: makes.map((id) => option(id, (t) => t.carMakes[id] ?? id, vehicleModelsOf(id, group, type).length > 0)),
      patch: typePatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.carMake,
    };
  }

  if (path[2] === BRANCH_ALL) {
    if (path.length !== 3) return null;
    return {
      ok: true,
      title: (t) => t.vehicleTypes[type] ?? type,
      parentPath: [group, type],
      options: [],
      patch: typePatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.carMake,
    };
  }

  const make = path[2];
  if (!makes.includes(make)) return null;
  const models = vehicleModelsOf(make, group, type);
  const makePatch: Partial<Filters> = { ...typePatch, carMake: make };

  if (path.length === 3) {
    return {
      ok: true,
      title: (t) => t.carMakes[make] ?? make,
      parentPath: [group, type],
      options: models.map((id) => option(id, (t) => t.carModels[id] ?? id, false)),
      patch: makePatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.carModel,
    };
  }

  if (path[3] === BRANCH_ALL) {
    if (path.length !== 4) return null;
    return {
      ok: true,
      title: (t) => t.carMakes[make] ?? make,
      parentPath: [group, type, make],
      options: [],
      patch: makePatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.carMake,
    };
  }

  const model = path[3];
  if (path.length !== 4 || !models.includes(model)) return null;
  return {
    ok: true,
    title: (t) => t.carModels[model] ?? model,
    parentPath: [group, type, make],
    options: [],
    patch: { ...makePatch, carModel: model },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.carModel,
  };
}

function rentPatch(
  group: string = "any",
  sub: string = "any",
  kind: string = "any",
): Partial<Filters> {
  const housingType = housingKindOfRealty(group === "any" ? undefined : group, kind === "any" ? undefined : kind);
  return {
    section: "rent",
    housingType,
    realtyGroup: group,
    realtySub: sub,
    realtyKind: kind,
    rooms: roomsOfRealtyKind(kind === "any" ? undefined : kind),
    stockType: stockOfRealtyKind(kind === "any" ? undefined : kind),
  };
}

function rent(path: string[]): BranchState | null {
  const groups = REALTY_GROUPS.map((id) => option(id, (t) => t.realtyGroups[id] ?? id, realtySubsOf(id).length > 0));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.rent,
      parentPath: [],
      options: groups,
      patch: rentPatch(),
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.realtyGroup,
    };
  }

  if (path[0] === BRANCH_ALL) {
    if (path.length !== 1) return null;
    return {
      ok: true,
      title: (t) => t.sectionNames.rent,
      parentPath: [],
      options: [],
      patch: rentPatch(),
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.realtyGroup,
    };
  }

  if (inList(path[0], PROPERTY_TYPES) && !isRealtyGroup(path[0])) {
    if (path.length !== 1) return null;
    const type = path[0];
    const group = housingTypeToRealtyGroup(type);
    const kind = type === "dacha" ? "dacha" : "any";
    const sub = type === "dacha" ? "houses-country" : "any";
    return {
      ok: true,
      title: (t) => t.propertyTypes[type],
      parentPath: [],
      options: [],
      patch: rentPatch(group, sub, kind),
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.realtyGroup,
    };
  }

  const group = path[0];
  if (!isRealtyGroup(group)) return null;
  const subs = realtySubsOf(group);
  const groupPatch = rentPatch(group);

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => t.realtyGroups[group] ?? group,
      parentPath: [],
      options: subs.map((id) => option(id, (t) => t.realtySubs[id] ?? id, realtyKindsOf(group, id).length > 0)),
      patch: groupPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.realtySub,
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.realtyGroups[group] ?? group,
      parentPath: [group],
      options: [],
      patch: groupPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.realtySub,
    };
  }

  const sub = path[1];
  if (!subs.includes(sub)) return null;
  const kinds = realtyKindsOf(group, sub);
  const subPatch = rentPatch(group, sub);

  if (path.length === 2) {
    return {
      ok: true,
      title: (t) => t.realtySubs[sub] ?? sub,
      parentPath: [group],
      options: kinds.map((id) => option(id, (t) => t.realtyKinds[id] ?? id, false)),
      patch: subPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.realtyKind,
    };
  }

  if (path[2] === BRANCH_ALL) {
    if (path.length !== 3) return null;
    return {
      ok: true,
      title: (t) => t.realtySubs[sub] ?? sub,
      parentPath: [group, sub],
      options: [],
      patch: subPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.realtyKind,
    };
  }

  const kind = path[2];
  if (path.length !== 3 || !kinds.includes(kind)) return null;
  return {
    ok: true,
    title: (t) => t.realtyKinds[kind] ?? kind,
    parentPath: [group, sub],
    options: [],
    patch: rentPatch(group, sub, kind),
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.realtyKind,
  };
}

function animals(path: string[]): BranchState | null {
  const base: Partial<Filters> = { section: "animals", animalGroup: "any", animalKind: "any" };
  const groups = ANIMAL_GROUPS.map((id) =>
    option(id, (t) => (id === "pets" ? t.animalPets : t.animalFarm), animalKindsOf(id).length > 0),
  );

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.animals,
      parentPath: [],
      options: groups,
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.category,
    };
  }

  const group = path[0];
  if (!inList(group, ANIMAL_GROUPS)) return null;
  const kinds = animalKindsOf(group);
  const groupPatch: Partial<Filters> = { ...base, animalGroup: group as AnimalGroup };

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => (group === "pets" ? t.animalPets : t.animalFarm),
      parentPath: [],
      options: kinds.map((id) => option(id, (t) => t.animalKinds[id], false)),
      patch: groupPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.animalKindLabel,
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => (group === "pets" ? t.animalPets : t.animalFarm),
      parentPath: [group],
      options: [],
      patch: groupPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.category,
    };
  }

  const kind = path[1];
  if (path.length !== 2 || !inList(kind, kinds)) return null;
  return {
    ok: true,
    title: (t) => t.animalKinds[kind] ?? kind,
    parentPath: [group],
    options: [],
    patch: { ...groupPatch, animalKind: kind },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.animalKindLabel,
  };
}

function flatCats(
  section: "services" | "construction" | "restaurants",
  cats: readonly string[],
  eyebrow: (t: Dict) => string,
  path: string[],
): BranchState | null {
  const base: Partial<Filters> = { section, category: null };
  const options = cats.map((id) => option(id, (t) => t.cats[id], false));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames[section],
      parentPath: [],
      options,
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow,
    };
  }

  const cat = path[0];
  if (path.length !== 1 || !inList(cat, cats)) return null;
  return {
    ok: true,
    title: (t) => t.cats[cat] ?? cat,
    parentPath: [],
    options: [],
    patch: { ...base, category: cat },
    isPicker: false,
    showFeed: true,
    eyebrow,
  };
}

function vacancies(path: string[]): BranchState | null {
  const base: Partial<Filters> = {
    section: "vacancies",
    jobSphere: "any",
    jobSub: "any",
    jobRole: "any",
  };
  const spheres = JOB_SPHERES.map((id) => option(id, (t) => t.jobSpheres[id] ?? id, jobSubsOf(id).length > 0));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.vacancies,
      parentPath: [],
      options: spheres,
      patch: base,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.jobSphere,
    };
  }

  if (path[0] === BRANCH_ALL) {
    if (path.length !== 1) return null;
    return {
      ok: true,
      title: (t) => t.sectionNames.vacancies,
      parentPath: [],
      options: [],
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.jobSphere,
    };
  }

  const sphere = path[0];
  if (!isJobSphere(sphere)) return null;
  const subs = jobSubsOf(sphere);
  const spherePatch: Partial<Filters> = { ...base, jobSphere: sphere };

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => t.jobSpheres[sphere] ?? sphere,
      parentPath: [],
      options: subs.map((id) => option(id, (t) => t.jobSubs[id] ?? id, jobRolesOf(sphere, id).length > 0)),
      patch: spherePatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.jobSub,
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.jobSpheres[sphere] ?? sphere,
      parentPath: [sphere],
      options: [],
      patch: spherePatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.jobSub,
    };
  }

  const sub = path[1];
  if (!subs.includes(sub)) return null;
  const roles = jobRolesOf(sphere, sub);
  const subPatch: Partial<Filters> = { ...spherePatch, jobSub: sub };

  if (path.length === 2) {
    return {
      ok: true,
      title: (t) => t.jobSubs[sub] ?? sub,
      parentPath: [sphere],
      options: roles.map((id) => option(id, (t) => t.jobRoles[id] ?? id, false)),
      patch: subPatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.jobRole,
    };
  }

  if (path[2] === BRANCH_ALL) {
    if (path.length !== 3) return null;
    return {
      ok: true,
      title: (t) => t.jobSubs[sub] ?? sub,
      parentPath: [sphere, sub],
      options: [],
      patch: subPatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.jobRole,
    };
  }

  const role = path[2];
  if (path.length !== 3 || !roles.includes(role)) return null;
  return {
    ok: true,
    title: (t) => t.jobRoles[role] ?? role,
    parentPath: [sphere, sub],
    options: [],
    patch: { ...subPatch, jobRole: role },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.jobRole,
  };
}

function leafSection(id: SectionId, path: string[]): BranchState | null {
  if (path.length) return null;
  return {
    ok: true,
    title: (t) => t.sectionNames[id],
    parentPath: [],
    options: [],
    patch: { section: id },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.category,
  };
}

export function resolveBranch(section: SectionId, path: string[]): BranchState | null {
  switch (section) {
    case "secondhand":
      return secondhand(path);
    case "cars":
    case "car-rental":
      return cars(path);
    case "rent":
      return rent(path);
    case "animals":
      return animals(path);
    case "services":
      return flatCats("services", SERVICE_CATEGORIES, (t) => t.category, path);
    case "construction":
      return flatCats("construction", CONSTRUCTION_CATEGORIES, (t) => t.category, path);
    case "restaurants":
      return flatCats("restaurants", RESTAURANT_CATEGORIES, (t) => t.cuisine, path);
    case "vacancies":
      return vacancies(path);
    case "stays":
      return leafSection(section, path);
    default:
      return null;
  }
}

export function pathFromFilters(filters: Filters): string[] {
  const section = filters.section;
  if (!section) return [];
  if (section === "secondhand") {
    const path: string[] = [];
    if (!filters.category) return path;
    path.push(filters.category);
    if (!filters.goodsKind || filters.goodsKind === "any") return path;
    path.push(filters.goodsKind);
    if (!isTechCategory(filters.category)) return path;
    if (!filters.techBrand || filters.techBrand === "any") return path;
    path.push(filters.techBrand);
    if (!filters.techModel || filters.techModel === "any") return path;
    path.push(filters.techModel);
    return path;
  }
  if (section === "cars" || section === "car-rental") {
    const group = filters.vehicleGroup;
    if (!isVehicleGroup(group)) return [];
    const path: string[] = [group];
    if (!filters.bodyType || filters.bodyType === "any") return path;
    path.push(filters.bodyType);
    if (!filters.carMake || filters.carMake === "any") return path;
    path.push(filters.carMake);
    if (!filters.carModel || filters.carModel === "any") return path;
    path.push(filters.carModel);
    return path;
  }
  if (section === "rent") {
    if (!filters.realtyGroup || filters.realtyGroup === "any") {
      const mapped = housingTypeToRealtyGroup(filters.housingType);
      return mapped === "any" ? [] : [mapped];
    }
    const path: string[] = [filters.realtyGroup];
    if (!filters.realtySub || filters.realtySub === "any") return path;
    path.push(filters.realtySub);
    if (!filters.realtyKind || filters.realtyKind === "any") return path;
    path.push(filters.realtyKind);
    return path;
  }
  if (section === "animals") {
    if (!filters.animalGroup || filters.animalGroup === "any") return [];
    if (!filters.animalKind || filters.animalKind === "any") return [filters.animalGroup];
    return [filters.animalGroup, filters.animalKind];
  }
  if (section === "services" || section === "construction" || section === "restaurants") {
    if (!filters.category) return [];
    return [filters.category];
  }
  if (section === "vacancies") {
    if (!filters.jobSphere || filters.jobSphere === "any") return [];
    const path: string[] = [filters.jobSphere];
    if (!filters.jobSub || filters.jobSub === "any") return path;
    path.push(filters.jobSub);
    if (!filters.jobRole || filters.jobRole === "any") return path;
    path.push(filters.jobRole);
    return path;
  }
  return [];
}

export function feedHrefFromFilters(filters: Filters): string {
  const section = filters.section;
  if (section === "shops") {
    const cat = filters.category;
    if (cat && isShopKind(cat)) {
      const parent = parentOfShopKind(cat);
      return parent ? `/shops/c/${parent}/${cat}` : "/shops";
    }
    if (cat && isShopCategory(cat) && cat !== "other") return `/shops/c/${cat}`;
    return "/shops";
  }
  if (!section || !isSectionId(section === "car-rental" ? "cars" : section)) {
    return "/";
  }
  const id: SectionId = section === "car-rental" ? "cars" : section;
  const path = pathFromFilters({ ...filters, section: id });
  const state = resolveBranch(id, path);
  if (state?.isPicker) return sectionHref(id, [...path, BRANCH_ALL]);
  return sectionHref(id, path);
}

export function sectionFeedReset(id: SectionId): Partial<Filters> {
  const branch = resolveBranch(id, []);
  return {
    query: "",
    ...(branch?.patch ?? { section: id }),
    priceMin: null,
    priceMax: null,
    rooms: [],
    areaMin: null,
    areaMax: null,
    bodyType: "any",
    gear: "any",
    photosOnly: false,
    verifiedOnly: false,
    noAgents: false,
    neighborOnly: false,
    sellerKind: "any",
    sort: "new",
    checkIn: null,
    checkOut: null,
    dealType: "any",
    stockType: "any",
    autoType: "sale",
    vehicleGroup: "any",
    jobType: "any",
    priceDroppedOnly: false,
    videoOnly: false,
  };
}
