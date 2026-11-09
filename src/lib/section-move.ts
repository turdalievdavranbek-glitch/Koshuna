import type { SectionId } from "./types";

/** Listing fields that the post form's section/category picker sets. A section move rewrites exactly these. */
export const TAXONOMY_KEYS = [
  "category",
  "goodsKind",
  "animalGroup",
  "animalKind",
  "vehicleGroup",
  "vehicleType",
  "carMake",
  "carModel",
  "techBrand",
  "techModel",
  "realtyGroup",
  "realtySub",
  "realtyKind",
  "housingKind",
  "dealKind",
  "rooms",
  "foodType",
  "gearKind",
  "jobSphere",
  "jobSub",
  "jobRole",
  "jobType",
] as const;

export type TaxonomyKey = (typeof TAXONOMY_KEYS)[number];

export type SectionMove = { section: SectionId } & Partial<Record<TaxonomyKey, string | number>>;

const SECTION_SET = new Set<string>([
  "rent",
  "secondhand",
  "animals",
  "cars",
  "car-rental",
  "stays",
  "services",
  "vacancies",
  "construction",
  "restaurants",
  "shops",
]);

/** Admin «Сменить раздел»: only known keys, short strings or small numbers. */
export function cleanSectionMove(raw: unknown): SectionMove | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.section !== "string" || !SECTION_SET.has(row.section)) return null;
  const out: SectionMove = { section: row.section as SectionId };
  for (const key of TAXONOMY_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value.trim() && value.length <= 80) out[key] = value.trim();
    else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1000) out[key] = value;
  }
  return out;
}

/** Copy of `target` with the old taxonomy dropped and the move applied. */
export function applySectionMove<T extends Record<string, unknown>>(target: T, move: SectionMove): T {
  const next: Record<string, unknown> = { ...target };
  for (const key of TAXONOMY_KEYS) delete next[key];
  return { ...next, ...move } as unknown as T;
}
