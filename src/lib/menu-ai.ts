import { isMenuKind, parentOfMenuKind } from "./menu";
import { validPrice } from "./shops";
import type { MenuKind } from "./types";

export type MenuAiDishHint = {
  title: string;
  price?: number;
};

const KIND_RULES: { id: MenuKind; keys: string[] }[] = [
  { id: "soup-national", keys: ["шорпо", "шорпа", "лагман (суп)", "лагман суп", "суп лагман"] },
  { id: "soup-european", keys: ["борщ", "крем-суп", "крем суп", "том ям"] },
  { id: "main-meat", keys: ["бешбармак", "плов", "палоо", "манты", "шашлык", "лагман", "казы"] },
  { id: "main-poultry", keys: ["куриные крыл", "крылья", "курица гриль"] },
  { id: "main-fish", keys: ["рыба на гриле", "рыба гриль", "форель"] },
  { id: "main-veg", keys: ["овощи на пару", "овощи гриль"] },
  { id: "salad-fresh", keys: ["свежих овощ", "овощной салат", "салат из свежих"] },
  { id: "salad-dressed", keys: ["цезарь", "цезар"] },
  { id: "salad-national", keys: ["ашлан-фу", "ашлянфу", "ашлян-фу"] },
  { id: "ff-burger", keys: ["бургер", "чизбургер", "гамбургер"] },
  { id: "ff-shawarma", keys: ["шаурма", "донер", "шаверма"] },
  { id: "ff-pizza", keys: ["пицца", "маргарита"] },
  { id: "ff-hotdog", keys: ["хот-дог", "хотдог"] },
  { id: "east-sushi", keys: ["суши", "ролл", "филадельфия", "рамен", "кимчи"] },
  { id: "east-wok", keys: ["wok", "вок", "лапша wok", "вок с"] },
  { id: "bake-national", keys: ["самса", "боорсок", "боорсок"] },
  { id: "bake-bread", keys: ["лепешка", "лепёшка", "нан "] },
  { id: "sweet-cake", keys: ["торт", "пирожн"] },
  { id: "sweet-cold", keys: ["мороженое"] },
  { id: "sweet-national", keys: ["чак-чак", "чакчак"] },
  { id: "drink-hot", keys: ["чай", "кофе", "американо"] },
  { id: "drink-cold", keys: ["компот", "лимонад"] },
  { id: "drink-fresh", keys: ["фреш", "свежевыжат", "сок апельсин"] },
  { id: "kids-food", keys: ["наггетс", "детск"] },
  { id: "kids-drink", keys: ["молочный коктейль", "коктейль"] },
  { id: "bf-eggs", keys: ["омлет", "яичниц"] },
  { id: "bf-porridge", keys: ["каша", "овсян"] },
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

export function extractDishes(raw: string): MenuAiDishHint[] {
  const chunks = raw
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=(?:сом|som|kgs))\s*[,.]?\s+|(?<=[.!;])\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const found: MenuAiDishHint[] = [];
  for (const chunk of chunks) {
    const som = chunk.match(/(?:от\s+)?(\d[\d\s]{1,6})\s*(?:сом|som|kgs)/i);
    const title = chunk
      .replace(/(?:от\s+)?\d[\d\s]{1,6}\s*(?:сом|som|kgs)/gi, "")
      .replace(/^[,.\s]+|[,.\s]+$/g, "")
      .trim();
    if (title.length < 3) continue;
    if (/^(цена|баа|это|мен|я|у нас|меню)$/i.test(title)) continue;
    found.push({ title: title.slice(0, 60), price: som ? validPrice(som[1]) : undefined });
  }
  if (!found.length && raw.trim().length >= 4) {
    found.push({ title: raw.replace(/\s+/g, " ").trim().slice(0, 60) });
  }
  const uniq = new Map<string, MenuAiDishHint>();
  for (const item of found) {
    const key = item.title.toLowerCase();
    if (!uniq.has(key)) uniq.set(key, item);
  }
  return [...uniq.values()].slice(0, 8);
}

export function dishKindCandidates(text: string): MenuKind[] {
  return KIND_RULES.map((rule) => ({ id: rule.id, score: score(norm(text), rule.keys) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.id)
    .filter(isMenuKind);
}

export const DEMO_MENU_COUNTER =
  "Бешбармак, 450 сом. Лагман жареный, 280 сом. Чай чёрный.";

export { parentOfMenuKind };
