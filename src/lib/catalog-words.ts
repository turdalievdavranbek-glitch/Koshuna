import { DICT } from "./i18n";

type CatalogItem = {
  category?: string;
  animalKind?: string;
  animalGroup?: string;
  carMake?: string;
  carModel?: string;
};

/** ru + ky catalog labels for one listing. Word forms («сауну», «бычки») stay in Шаг 21. */
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

function fold(text: string) {
  return text.toLowerCase().replace(/ё/g, "е");
}

/**
 * Plural catalog labels differ from the singular by the last letter
 * («Сауны» / «сауна», «Стоматологии» / «стоматология»). Not a stemmer.
 */
function catalogLabelNear(words: string, query: string): boolean {
  if (query.length < 4) return false;
  const tokens = fold(words).split(/[^0-9a-zа-яңөү-]+/i).filter((word) => word.length >= 4);
  return tokens.some((word) => {
    if (Math.abs(word.length - query.length) > 1) return false;
    const n = Math.min(word.length, query.length) - 1;
    return word.slice(0, n) === query.slice(0, n);
  });
}

export function listingTextHit(
  item: CatalogItem & { title: string; titleEn: string; titleKy: string; description: string },
  query: string,
): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const words = catalogWords(item);
  const blob = fold(`${item.title} ${item.titleEn} ${item.titleKy} ${item.description} ${words}`);
  if (blob.includes(q)) return true;
  return catalogLabelNear(words, q);
}
