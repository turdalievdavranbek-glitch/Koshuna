import { isShopCategory, isShopKind, parentOfShopKind, SHOP_CATEGORIES, validPrice } from "./shops";
import type { ShopCategory, ShopDraft, ShopHours, ShopKind, ShopProductUnit } from "./types";

export type ShopAiProductHint = {
  title: string;
  price?: number;
  unit?: ShopProductUnit;
};

export type ShopAiGuess = {
  name?: string;
  description?: string;
  category?: ShopCategory;
  extraCategories?: ShopCategory[];
  kinds?: ShopKind[];
  hoursNote?: string;
  hours?: ShopHours;
  pickup?: boolean;
  delivery?: boolean;
  products?: ShopAiProductHint[];
  /** Fields the model actually found in speech — never invent the rest. */
  filled: string[];
};

const CAT_RULES: { id: ShopCategory; keys: string[] }[] = [
  { id: "food", keys: ["продукт", "бакале", "азык", "магазин продуктов", "овощ", "фрукт", "хлеб", "мясо", "молоч"] },
  { id: "construction", keys: ["строй", "цемент", "кирпич", "пиломатериал", "арматур", "кровл", "курулуш"] },
  { id: "furniture", keys: ["мебел", "эмерек", "диван", "шкаф", "стол", "кровать"] },
  { id: "electronics", keys: ["электрон", "бытов", "холодильник", "стирал", "телевизор", "телефон", "ноутбук"] },
  { id: "apparel", keys: ["одежд", "обув", "кийим", "куртка", "платье", "кроссов"] },
  { id: "home", keys: ["для дома", "хозяйств", "посуд", "текстил", "уют"] },
];

const KIND_RULES: { id: ShopKind; keys: string[] }[] = [
  { id: "food-bakery", keys: ["хлеб", "выпечк", "булоч", "нан ", "лепеш"] },
  { id: "food-meat", keys: ["мясо", "птиц", "говяд", "барани", "кур ", "эт "] },
  { id: "food-dairy", keys: ["молоч", "сыр", "кефир", "айран", "сметан", "сүт"] },
  { id: "food-produce", keys: ["овощ", "фрукт", "зелен", "жашылча", "жемиш"] },
  { id: "food-staples", keys: ["бакале", "крупа", "мука", "рис", "масло подсолн"] },
  { id: "food-drinks", keys: ["напит", "сок", "вода", "ичимдик", "газиров"] },
  { id: "food-sweets", keys: ["сладост", "шоколад", "печен", "снек", "таттуу"] },
  { id: "food-frozen", keys: ["замороз", "мороженое", "тоңдур"] },
  { id: "build-mix", keys: ["цемент", "смесь", "штукатур"] },
  { id: "build-timber", keys: ["пиломатериал", "доска", "брус"] },
  { id: "build-plumbing", keys: ["сантех", "труба", "смесител"] },
  { id: "build-electrical", keys: ["кабель", "провод", "розетк", "электрик"] },
  { id: "build-tools", keys: ["инструмент", "дрель", "шуруповерт"] },
  { id: "build-finishes", keys: ["отделк", "плитка", "краска", "обои"] },
  { id: "furn-sofa", keys: ["диван"] },
  { id: "furn-bed", keys: ["кроват", "матрас"] },
  { id: "furn-storage", keys: ["шкаф", "комод"] },
  { id: "furn-table", keys: ["стол", "стул"] },
  { id: "furn-kitchen", keys: ["кухн"] },
  { id: "el-phones", keys: ["телефон", "смартфон"] },
  { id: "el-computers", keys: ["ноутбук", "компьютер"] },
  { id: "el-tv", keys: ["телевизор"] },
  { id: "el-appliances", keys: ["холодильник", "стирал", "плита"] },
  { id: "el-audio", keys: ["колонк", "наушник"] },
  { id: "ap-men", keys: ["мужск"] },
  { id: "ap-women", keys: ["женск"] },
  { id: "ap-kids", keys: ["детск", "балалар"] },
  { id: "ap-shoes", keys: ["обув", "кроссов"] },
  { id: "ap-acc", keys: ["сумк", "ремень"] },
  { id: "home-kitchen", keys: ["посуд"] },
  { id: "home-textile", keys: ["текстил", "полотенц"] },
  { id: "home-decor", keys: ["декор"] },
  { id: "home-clean", keys: ["бытов хими", "моющее"] },
];

function norm(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function score(text: string, keys: string[]): number {
  let total = 0;
  for (const key of keys) {
    if (text.includes(key)) total += Math.max(2, key.length);
  }
  return total;
}

function extractHours(text: string): { hours?: ShopHours; hoursNote?: string } {
  const note: string[] = [];
  let weekdays: ShopHours["weekdays"];
  if (/круглосуточ|24\s*час|түнү-күнү/.test(text)) {
    weekdays = { open: "00:00", close: "23:59" };
    note.push("круглосуточно");
  }
  const span = text.match(/с\s+(\d{1,2})(?:[:.](\d{2}))?\s+до\s+(\d{1,2})(?:[:.](\d{2}))?/);
  const ky = text.match(/саат\s+(\d{1,2}).{0,8}(\d{1,2})/);
  if (span) {
    const o = `${span[1].padStart(2, "0")}:${span[2] ?? "00"}`;
    const c = `${span[3].padStart(2, "0")}:${span[4] ?? "00"}`;
    weekdays = { open: o, close: c };
    note.push(`с ${o} до ${c}`);
  } else if (ky) {
    weekdays = { open: `${ky[1].padStart(2, "0")}:00`, close: `${ky[2].padStart(2, "0")}:00` };
    note.push(`саат ${ky[1]}–${ky[2]}`);
  }
  if (!weekdays && !note.length) return {};
  return { hours: weekdays ? { weekdays } : undefined, hoursNote: note.join(", ") };
}

function extractFulfillment(text: string): { pickup?: boolean; delivery?: boolean } {
  const out: { pickup?: boolean; delivery?: boolean } = {};
  if (/самовывоз|өзүңүз алып|алып кет/.test(text)) out.pickup = true;
  if (/доставк|жеткир/.test(text)) out.delivery = true;
  return out;
}

function extractProducts(raw: string): ShopAiProductHint[] {
  const text = raw.replace(/\s+/g, " ");
  const found: ShopAiProductHint[] = [];
  const re = /([A-Za-zА-Яа-яЁёҮүҢңӨөІі\-]{3,}(?:\s+[A-Za-zА-Яа-яЁёҮүҢңӨөІі\-]{2,}){0,3})\s+(\d[\d\s]{1,6})\s*(?:сом|som|kgs)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const title = m[1].trim();
    const price = validPrice(m[2]);
    if (title.length < 3) continue;
    if (/^(цена|баа|это|мен|я|биз|у нас)$/i.test(title)) continue;
    found.push({ title: title.slice(0, 60), price, unit: "piece" });
  }
  const uniq = new Map<string, ShopAiProductHint>();
  for (const item of found) {
    const key = item.title.toLowerCase();
    if (!uniq.has(key)) uniq.set(key, item);
  }
  return [...uniq.values()].slice(0, 8);
}

function categoriesFrom(text: string): { category?: ShopCategory; extra: ShopCategory[] } {
  const ranked = CAT_RULES.map((rule) => ({ id: rule.id, score: score(text, rule.keys) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return { extra: [] };
  return { category: ranked[0].id, extra: ranked.slice(1, 3).map((r) => r.id) };
}

function kindsFrom(text: string): ShopKind[] {
  return KIND_RULES.filter((rule) => score(text, rule.keys) > 0).map((rule) => rule.id);
}

function shopName(raw: string, text: string): string | undefined {
  const branded = raw.match(/(?:магазин|дүкөн|точка)\s+[«"]?([A-Za-zА-Яа-яЁёҮүҢңӨө0-9 \-]{3,40})/i);
  if (branded?.[1]) return branded[1].replace(/[«»"]/g, "").trim().slice(0, 60);
  const first = raw.split(/(?<=[.!?])\s+/)[0] ?? "";
  const clean = first.replace(/^ассалаумаалейкум[.,]?\s*/i, "").trim();
  if (clean.length >= 4 && clean.length <= 60 && !/\d{4,}/.test(clean)) return clean;
  if (/магазин|дүкөн/.test(text)) return undefined;
  return undefined;
}

/** Local speech parser. Does not invent address, phone, prices, stock or hours unless they appear in the text. */
export function classifyShopSpeech(raw: string): ShopAiGuess {
  const text = norm(raw);
  const filled: string[] = [];
  const cats = categoriesFrom(text);
  const kinds = kindsFrom(text).filter(isShopKind);
  const hours = extractHours(text);
  const fulfill = extractFulfillment(text);
  const products = extractProducts(raw);
  const name = shopName(raw, text);
  const guess: ShopAiGuess = { filled, extraCategories: [] };
  if (name) {
    guess.name = name;
    filled.push("name");
  }
  if (raw.trim()) {
    guess.description = raw.replace(/\s+/g, " ").trim();
    filled.push("description");
  }
  if (cats.category && isShopCategory(cats.category)) {
    guess.category = cats.category;
    filled.push("category");
  } else if (kinds.length) {
    const parent = parentOfShopKind(kinds[0]);
    if (parent) {
      guess.category = parent;
      filled.push("category");
    }
  }
  if (cats.extra.length) {
    guess.extraCategories = cats.extra.filter((id) => id !== cats.category);
    filled.push("extraCategories");
  }
  if (kinds.length) {
    guess.kinds = kinds.slice(0, 6);
    filled.push("kinds");
  }
  if (hours.hours || hours.hoursNote) {
    guess.hours = hours.hours;
    guess.hoursNote = hours.hoursNote;
    filled.push("hours");
  }
  if (fulfill.pickup != null) {
    guess.pickup = fulfill.pickup;
    filled.push("pickup");
  }
  if (fulfill.delivery != null) {
    guess.delivery = fulfill.delivery;
    filled.push("delivery");
  }
  if (products.length) {
    guess.products = products;
    filled.push("products");
  }
  return guess;
}

type Touchable = "name" | "description" | "category" | "extraCategories" | "kinds" | "hours" | "hoursNote" | "pickup" | "delivery";

export function applyShopAi(draft: ShopDraft, guess: ShopAiGuess): Partial<ShopDraft> {
  const patch: Partial<ShopDraft> = {};
  const locked = draft.locked ?? {};
  const take = (key: Touchable, value: unknown, empty: boolean) => {
    if (value == null) return;
    if (locked[key]) return;
    if (!empty) return;
    (patch as Record<string, unknown>)[key] = value;
  };
  take("name", guess.name, !draft.name.trim());
  take("description", guess.description, !draft.description.trim());
  take("category", guess.category, draft.category === "other" || !draft.category);
  take("extraCategories", guess.extraCategories, !draft.extraCategories.length);
  take("kinds", guess.kinds, !(draft.kinds ?? []).length);
  take("hours", guess.hours, !draft.hours);
  take("hoursNote", guess.hoursNote, !draft.hoursNote?.trim());
  take("pickup", guess.pickup, true);
  take("delivery", guess.delivery, true);
  if (guess.products?.length) {
    const have = new Set((draft.pendingProducts ?? []).map((p) => p.title.toLowerCase()));
    const extra = guess.products.filter((p) => !have.has(p.title.toLowerCase()));
    if (extra.length) patch.pendingProducts = [...(draft.pendingProducts ?? []), ...extra];
  }
  return patch;
}

export function shopAiConfigured(): boolean {
  return Boolean(process.env.SHOP_AI_URL);
}

export { SHOP_CATEGORIES };
