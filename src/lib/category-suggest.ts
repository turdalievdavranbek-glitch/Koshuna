import { CATEGORY_WORDS, type CategoryWord } from "./category-words";
import {
  ANIMAL_GROUPS,
  CATEGORIES,
  CONSTRUCTION_CATEGORIES,
  SERVICE_CATEGORIES,
  animalKindsOf,
  goodsKindsOf,
} from "./data";
import { DICT } from "./i18n";
import { listingCategoryError } from "./listing-rules";
import type { AnimalGroup, SectionId } from "./types";
import { RULES } from "./video-ai";

export type CategoryPick = {
  section: SectionId;
  category?: string;
  goodsKind?: string;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  vehicleGroup?: "passenger" | "special";
  carMake?: string;
  techBrand?: string;
  score: number;
};

export type CategoryIndexEntry = Omit<CategoryPick, "score"> & { keys: string[] };

const MEDICINE = ["лекарств", "таблет", "дары", "аптек", "парацетамол", "антибиотик", "сироп"];
const LAST_KEY = "konshu.lastCategory";

const PERSONAL_SKIP = new Set<SectionId>(["shops", "restaurants"]);

export function normCategoryText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(text: string): string[] {
  return text
    .split(/[^0-9a-zа-яөүң]+/i)
    .map((part) => normCategoryText(part))
    .filter((part) => part.length >= 2);
}

function hit(text: string, tokens: string[], keyRaw: string): number {
  const key = normCategoryText(keyRaw);
  if (key.length < 2) return 0;
  if (text.includes(key)) return key.length;
  const head = key.split(" ")[0] ?? key;
  for (const tok of tokens) {
    if (head.length <= 2) {
      if (tok === head || (tok.startsWith(head) && tok.length >= head.length + 2 && tok.length <= head.length + 4)) return head.length;
      continue;
    }
    const n = Math.min(tok.length, head.length, 5);
    if (n >= 3 && tok.slice(0, n) === head.slice(0, n)) return Math.min(head.length, Math.max(n, 3));
  }
  return 0;
}

function pushEntry(into: CategoryIndexEntry[], partial: Omit<CategoryIndexEntry, "keys">, keys: Array<string | undefined>) {
  const clean = keys.map((key) => (key ? normCategoryText(key) : "")).filter((key) => key.length >= 2);
  if (!clean.length) return;
  into.push({ ...partial, keys: clean });
}

/** Built once from catalog labels (ru+ky), speech rules and the hand list. Step 21 reuses this. */
export function buildCategoryIndex(): CategoryIndexEntry[] {
  if (cached) return cached;
  const ru = DICT.ru;
  const ky = DICT.ky;
  const entries: CategoryIndexEntry[] = [];
  const sections: SectionId[] = [
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
  ];
  for (const id of sections) {
    pushEntry(entries, { section: id }, [ru.sectionNames[id], ky.sectionNames[id]]);
  }
  for (const cat of CATEGORIES) {
    pushEntry(entries, { section: "secondhand", category: cat }, [ru.cats[cat], ky.cats[cat]]);
  }
  for (const cat of CATEGORIES) {
    for (const kind of goodsKindsOf(cat)) {
      pushEntry(entries, { section: "secondhand", category: cat, goodsKind: kind }, [ru.goodsKinds[kind], ky.goodsKinds[kind]]);
    }
  }
  for (const group of ANIMAL_GROUPS) {
    pushEntry(entries, { section: "animals", animalGroup: group }, [ru.animalGroups[group], ky.animalGroups[group]]);
    for (const kind of animalKindsOf(group)) {
      pushEntry(entries, { section: "animals", animalGroup: group, animalKind: kind }, [ru.animalKinds[kind], ky.animalKinds[kind]]);
    }
  }
  for (const cat of CONSTRUCTION_CATEGORIES) {
    pushEntry(entries, { section: "construction", category: cat }, [ru.cats[cat], ky.cats[cat]]);
  }
  for (const cat of SERVICE_CATEGORIES) {
    pushEntry(entries, { section: "services", category: cat }, [ru.cats[cat], ky.cats[cat]]);
  }
  for (const [id, label] of Object.entries(ru.carMakes)) {
    pushEntry(entries, { section: "cars", vehicleGroup: "passenger", carMake: id }, [label, ky.carMakes[id]]);
  }
  for (const [id, label] of Object.entries(ru.techBrands)) {
    pushEntry(entries, { section: "secondhand", techBrand: id }, [label, ky.techBrands[id]]);
  }
  for (const rule of RULES) {
    pushEntry(
      entries,
      {
        section: rule.section,
        category: rule.category,
        goodsKind: rule.goodsKind,
        animalGroup: rule.animalGroup,
        animalKind: rule.animalKind,
        vehicleGroup: rule.vehicleGroup,
        carMake: rule.carMake,
        techBrand: rule.techBrand,
      },
      rule.keys,
    );
  }
  for (const word of CATEGORY_WORDS) pushEntry(entries, wordFields(word), word.keys);
  cached = entries;
  return entries;
}

let cached: CategoryIndexEntry[] | null = null;

function wordFields(word: CategoryWord): Omit<CategoryIndexEntry, "keys"> {
  return {
    section: word.section,
    category: word.category,
    goodsKind: word.goodsKind,
    animalGroup: word.animalGroup,
    animalKind: word.animalKind,
    vehicleGroup: word.vehicleGroup,
    carMake: word.carMake,
    techBrand: word.techBrand,
  };
}

function depth(pick: Omit<CategoryPick, "score">): number {
  return [pick.category, pick.goodsKind, pick.animalKind, pick.animalGroup, pick.carMake, pick.techBrand, pick.vehicleGroup].filter(Boolean).length;
}

function labelKey(pick: Omit<CategoryPick, "score">): string {
  if (pick.animalKind) return `${pick.section}:k:${pick.animalKind}`;
  if (pick.category) return `${pick.section}:c:${pick.category}`;
  if (pick.carMake) return `${pick.section}:m:${pick.carMake}`;
  if (pick.techBrand) return `${pick.section}:b:${pick.techBrand}`;
  return pick.section;
}

function allowed(pick: CategoryPick, personal: boolean): boolean {
  if (personal && PERSONAL_SKIP.has(pick.section)) return false;
  return listingCategoryError(pick, personal ? null : []) == null;
}

export function mentionsMedicine(text: string): boolean {
  const n = normCategoryText(text);
  if (!n) return false;
  return MEDICINE.some((key) => n.includes(key));
}

export function suggestCategories(text: string, opts?: { personal?: boolean; last?: CategoryPick | null }): CategoryPick[] {
  const personal = opts?.personal !== false;
  const norm = normCategoryText(text);
  if (norm.length < 3) return [];
  const tokens = tokensOf(norm);
  const index = buildCategoryIndex();
  type Scored = { pick: CategoryPick; specificity: number; depth: number };
  const scored: Scored[] = [];
  for (const entry of index) {
    let score = 0;
    let matched = 0;
    for (const key of entry.keys) {
      const got = hit(norm, tokens, key);
      if (got > 0) {
        score += got;
        matched += 1;
      }
    }
    if (score <= 0) continue;
    const pick: CategoryPick = {
      section: entry.section,
      category: entry.category,
      goodsKind: entry.goodsKind,
      animalGroup: entry.animalGroup,
      animalKind: entry.animalKind,
      vehicleGroup: entry.vehicleGroup,
      carMake: entry.carMake,
      techBrand: entry.techBrand,
      score,
    };
    if (!allowed(pick, personal)) continue;
    scored.push({ pick, specificity: matched / entry.keys.length, depth: depth(pick) });
  }
  scored.sort((a, b) => {
    if (b.pick.score !== a.pick.score) return b.pick.score - a.pick.score;
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    if (b.depth !== a.depth) return b.depth - a.depth;
    const last = opts?.last;
    if (last) {
      const ap = a.pick.section === last.section ? 1 : 0;
      const bp = b.pick.section === last.section ? 1 : 0;
      if (bp !== ap) return bp - ap;
    }
    return 0;
  });
  const out: CategoryPick[] = [];
  const seen = new Set<string>();
  for (const row of scored) {
    const key = labelKey(row.pick);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row.pick);
    if (out.length === 3) break;
  }
  if (out.length) return out;
  const last = opts?.last;
  if (last && allowed({ ...last, score: 0 }, personal)) return [{ ...last, score: 0 }];
  return [{ section: "secondhand", score: 0 }];
}

export function readLastCategory(personal = true): CategoryPick | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const pick = JSON.parse(raw) as CategoryPick;
    if (!pick?.section) return null;
    const next = { ...pick, score: 0 };
    if (!allowed(next, personal)) return null;
    return next;
  } catch {
    return null;
  }
}

export function writeLastCategory(pick: Pick<CategoryPick, "section" | "category" | "goodsKind" | "animalGroup" | "animalKind">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({
        section: pick.section,
        category: pick.category,
        goodsKind: pick.goodsKind,
        animalGroup: pick.animalGroup,
        animalKind: pick.animalKind,
      }),
    );
  } catch {
    /* quota: the listing is already published */
  }
}

export function categoryChipLabel(
  pick: CategoryPick,
  t: { sectionNames: Record<string, string>; cats: Record<string, string>; animalKinds: Record<string, string>; carMakes: Record<string, string>; catNoRefine: string; catAsLast: string },
  opts?: { asLast?: boolean; noRefine?: boolean },
): string {
  const section = t.sectionNames[pick.section] ?? pick.section;
  const detail = pick.animalKind
    ? t.animalKinds[pick.animalKind]
    : pick.category
      ? t.cats[pick.category]
      : pick.carMake
        ? t.carMakes[pick.carMake]
        : "";
  if (!detail) {
    if (opts?.asLast) return `${section} ${t.catAsLast}`;
    if (opts?.noRefine || pick.score === 0) return `${section} · ${t.catNoRefine}`;
    return section;
  }
  return `${section} › ${detail}`;
}
