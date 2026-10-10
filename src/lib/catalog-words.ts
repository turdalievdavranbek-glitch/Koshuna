import { DICT } from "./i18n";

type CatalogItem = {
  category?: string;
  animalKind?: string;
  animalGroup?: string;
  carMake?: string;
  carModel?: string;
};

/** ru + ky catalog labels for one listing. */
export function catalogWords(item: CatalogItem): string {
  const parts: string[] = [];
  for (const dict of [DICT.ru, DICT.ky]) {
    if (item.category && dict.cats[item.category]) parts.push(dict.cats[item.category]);
    if (item.animalKind && dict.animalKinds[item.animalKind]) parts.push(dict.animalKinds[item.animalKind]);
    if (item.animalGroup && dict.animalGroups[item.animalGroup]) parts.push(dict.animalGroups[item.animalGroup]);
    if (item.carMake && dict.carMakes[item.carMake]) parts.push(dict.carMakes[item.carMake]);
    if (item.carModel && dict.carModels[item.carModel]) parts.push(dict.carModels[item.carModel]);
    if (item.category && dict.shopKinds[item.category]) parts.push(dict.shopKinds[item.category]);
  }
  return parts.join(" ");
}

type ShopWords = {
  name: string;
  kindOther?: string;
  category: string;
  extraCategories?: string[];
  kinds?: string[];
};

/** Point name, kind and category labels in ru + ky. Same stem match as listings. */
export function shopSearchText(shop: ShopWords): string {
  const parts = [shop.name, shop.kindOther ?? ""];
  for (const dict of [DICT.ru, DICT.ky]) {
    if (shop.category && dict.shopCats[shop.category]) parts.push(dict.shopCats[shop.category]);
    for (const extra of shop.extraCategories ?? []) {
      if (dict.shopCats[extra]) parts.push(dict.shopCats[extra]);
    }
    for (const kind of shop.kinds ?? []) {
      if (dict.shopKinds[kind]) parts.push(dict.shopKinds[kind]);
    }
  }
  return parts.join(" ");
}

function fold(text: string) {
  return text.toLowerCase().replace(/ё/g, "е");
}

function tokenize(text: string): string[] {
  return fold(text)
    .split(/[^0-9a-zа-яңөү]+/i)
    .filter((word) => word.length > 0);
}

/** KG plural/case suffixes from Шаг 21, longest first. */
const KG_SUFFIXES = ["лар", "лер", "дар", "дер", "тар", "тер", "ды", "ди", "га", "ге"];

/** One common Russian ending. Longest first so «ие» wins over «е». */
const RU_ENDINGS = [
  "ями",
  "ами",
  "ого",
  "его",
  "ому",
  "ему",
  "ыми",
  "ими",
  "ах",
  "ях",
  "ов",
  "ев",
  "ей",
  "ий",
  "ый",
  "ой",
  "ая",
  "яя",
  "ое",
  "ее",
  "ые",
  "ие",
  "ую",
  "юю",
  "ею",
  "ою",
  "ам",
  "ям",
  "ом",
  "ем",
  "а",
  "я",
  "ы",
  "и",
  "у",
  "ю",
  "е",
  "о",
  "ь",
];

function stripOne(word: string, suffixes: readonly string[]): string | null {
  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return null;
}

/** Candidate stems of at least 3 characters. «яйца»/«яйцо» share «яйц», «сауну»/«сауна» share «саун». */
function stemsOf(word: string): string[] {
  const folded = fold(word);
  const out = new Set<string>();
  const add = (stem: string) => {
    if (stem.length >= 3) out.add(stem);
  };
  add(folded);
  const ru = stripOne(folded, RU_ENDINGS);
  if (ru) add(ru);
  const kg = stripOne(folded, KG_SUFFIXES);
  if (kg) {
    add(kg);
    const both = stripOne(kg, RU_ENDINGS);
    if (both) add(both);
  }
  return [...out];
}

/** Lowercase, ё→е, then stem match. Short tokens (under 3) must match a whole word. */
export function wordsHit(text: string, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const blob = fold(text);
  if (blob.includes(q)) return true;
  const qTokens = tokenize(q);
  if (!qTokens.length) return false;
  const textTokens = tokenize(blob);
  const stemSet = new Set<string>();
  for (const token of textTokens) {
    for (const stem of stemsOf(token)) stemSet.add(stem);
  }
  return qTokens.every((token) => {
    if (token.length < 3) return textTokens.includes(token);
    return stemsOf(token).some((stem) => stemSet.has(stem));
  });
}

export function listingTextHit(
  item: CatalogItem & { title: string; titleEn: string; titleKy: string; description: string; descriptionKy?: string },
  query: string,
): boolean {
  const words = catalogWords(item);
  const blob = `${item.title} ${item.titleEn} ${item.titleKy} ${item.description} ${item.descriptionKy ?? ""} ${words}`;
  return wordsHit(blob, query);
}
