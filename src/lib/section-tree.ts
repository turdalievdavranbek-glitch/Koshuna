import {
  ANIMAL_GROUPS,
  CAR_MAKES,
  CATEGORIES,
  CONSTRUCTION_CATEGORIES,
  PROPERTY_TYPES,
  RESTAURANT_CATEGORIES,
  SERVICE_CATEGORIES,
  animalKindsOf,
  carModelsOf,
  goodsKindsOf,
  isTechCategory,
  techBrandsOf,
  techModelsOf,
} from "./data";
import type { Dict } from "./i18n";
import { isSectionId } from "./section";
import type { AnimalGroup, Filters, SectionId } from "./types";

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
    carMake: "any",
    carModel: "any",
  };
  const makes = CAR_MAKES.map((id) => option(id, (t) => t.carMakes[id], carModelsOf(id).length > 0));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.cars,
      parentPath: [],
      options: makes,
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.carMake,
    };
  }

  const make = path[0];
  if (!inList(make, CAR_MAKES)) return null;
  const models = carModelsOf(make);
  const makePatch: Partial<Filters> = { ...base, carMake: make };

  if (path.length === 1) {
    return {
      ok: true,
      title: (t) => t.carMakes[make],
      parentPath: [],
      options: models.map((id) => option(id, (t) => t.carModels[id], false)),
      patch: makePatch,
      isPicker: true,
      showFeed: false,
      eyebrow: (t) => t.carModel,
    };
  }

  if (path[1] === BRANCH_ALL) {
    if (path.length !== 2) return null;
    return {
      ok: true,
      title: (t) => t.carMakes[make],
      parentPath: [make],
      options: [],
      patch: makePatch,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.carMake,
    };
  }

  const model = path[1];
  if (path.length !== 2 || !inList(model, models)) return null;
  return {
    ok: true,
    title: (t) => t.carModels[model] ?? model,
    parentPath: [make],
    options: [],
    patch: { ...makePatch, carModel: model },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.carModel,
  };
}

function rent(path: string[]): BranchState | null {
  const base: Partial<Filters> = { section: "rent", housingType: "any" };
  const types = PROPERTY_TYPES.map((id) => option(id, (t) => t.propertyTypes[id], false));

  if (!path.length) {
    return {
      ok: true,
      title: (t) => t.sectionNames.rent,
      parentPath: [],
      options: types,
      patch: base,
      isPicker: false,
      showFeed: true,
      eyebrow: (t) => t.housingType,
    };
  }

  const type = path[0];
  if (path.length !== 1 || !inList(type, PROPERTY_TYPES)) return null;
  return {
    ok: true,
    title: (t) => t.propertyTypes[type],
    parentPath: [],
    options: [],
    patch: { ...base, housingType: type },
    isPicker: false,
    showFeed: true,
    eyebrow: (t) => t.housingType,
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
    case "stays":
    case "vacancies":
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
    if (!filters.carMake || filters.carMake === "any") return [];
    if (!filters.carModel || filters.carModel === "any") return [filters.carMake];
    return [filters.carMake, filters.carModel];
  }
  if (section === "rent") {
    if (!filters.housingType || filters.housingType === "any") return [];
    return [filters.housingType];
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
  return [];
}

export function feedHrefFromFilters(filters: Filters): string {
  const section = filters.section;
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
    bodyType: "any",
    gear: "any",
    photosOnly: false,
    verifiedOnly: false,
    noAgents: false,
    neighborOnly: false,
    sort: "new",
    checkIn: null,
    checkOut: null,
    dealType: "any",
    stockType: "any",
    locLng: null,
    locLat: null,
    locLabel: null,
    autoType: id === "cars" ? "sale" : "sale",
    settlement: "any",
    aiylOnly: false,
    priceDroppedOnly: false,
    videoOnly: false,
  };
}
