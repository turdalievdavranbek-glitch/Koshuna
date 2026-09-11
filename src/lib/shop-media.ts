import { parentOfShopKind } from "./shops";
import { classifyShopSpeech, kindCandidates, type ShopAiProductHint } from "./shop-ai";
import type { ShopCategory, ShopKind, ShopProductUnit } from "./types";

export type ShopItemDraft = {
  id: string;
  title: string;
  description?: string;
  price?: number;
  quantity?: number;
  unit?: ShopProductUnit;
  photo?: string;
  kind?: ShopKind;
  category?: ShopCategory;
  kindOptions: ShopKind[];
  selected: boolean;
  source: "photos" | "voice" | "video";
};

export function draftsFromShopSpeech(
  raw: string,
  fallback?: { kind?: ShopKind; category?: ShopCategory },
): ShopItemDraft[] {
  const guess = classifyShopSpeech(raw);
  const products: ShopAiProductHint[] = guess.products?.length
    ? guess.products
    : raw.trim()
      ? [{ title: raw.replace(/\s+/g, " ").trim().slice(0, 60) }]
      : [];
  const globalKinds = kindCandidates(raw);
  return products.map((item, index) => {
    const local = kindCandidates(item.title);
    const guessed = uniqueKinds(
      [...(local.length ? local : globalKinds), fallback?.kind].filter(Boolean) as ShopKind[],
    );
    const locked = fallback?.kind;
    const options = locked ? [locked] : guessed.slice(0, 3);
    const kind = locked ?? options[0];
    return {
      id: `sd-${index}-${slugId(item.title)}`,
      title: item.title,
      description: item.title,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      kind,
      category: parentOfShopKind(kind) ?? fallback?.category,
      kindOptions: options,
      selected: true,
      source: "voice",
    };
  });
}

export function pairDraftsWithStills(
  drafts: ShopItemDraft[],
  stills: string[],
  source: ShopItemDraft["source"] = "photos",
): ShopItemDraft[] {
  if (!drafts.length && stills.length) {
    return [
      {
        id: "sd-still",
        title: "",
        photo: stills[0],
        kindOptions: [],
        selected: true,
        source,
      },
    ];
  }
  if (drafts.length === 1) {
    return [{ ...drafts[0], photo: stills[0] ?? drafts[0].photo, source }];
  }
  return drafts.map((row, i) => ({ ...row, photo: stills[i] ?? stills[0] ?? row.photo, source }));
}

export function kindParent(kind?: ShopKind, fallback?: ShopCategory): ShopCategory | undefined {
  return (kind ? parentOfShopKind(kind) : undefined) ?? fallback;
}

function uniqueKinds(ids: ShopKind[]): ShopKind[] {
  const seen = new Set<ShopKind>();
  const out: ShopKind[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function slugId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "").slice(0, 8);
  return slug || "item";
}
