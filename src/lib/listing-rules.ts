import { isAnimalGroup, isKnownAnimalKind, SERVICE_CATEGORIES } from "./data";

export type ListingRuleError = "bad-category" | "pharmacy-only";

const LEAVES = SERVICE_CATEGORIES as readonly string[];

/** Medicines are the shop categories a pharmacy point uses. A service leaf is never one of these. */
function isPharmacyCategory(category: string | null | undefined): boolean {
  return category === "health" || category === "health-pharmacy";
}

export function listingCategoryError(
  l: { section?: string; category?: string | null; animalGroup?: string | null; animalKind?: string | null },
  shopKinds: readonly string[] | null,
): ListingRuleError | null {
  if (l.section === "services") {
    if (!l.category || !LEAVES.includes(l.category)) return "bad-category";
  }
  if (l.section === "animals") {
    if (l.animalGroup && !isAnimalGroup(l.animalGroup)) return "bad-category";
    const kind = l.animalKind;
    if (kind && kind !== "any" && kind !== "cattle" && !isKnownAnimalKind(kind)) return "bad-category";
  }
  if (isPharmacyCategory(l.category) && !shopKinds?.includes("health-pharmacy")) return "pharmacy-only";
  return null;
}
