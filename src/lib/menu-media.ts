import { parentOfMenuKind } from "./menu";
import { dishKindCandidates, extractDishes } from "./menu-ai";
import type { MenuCategory, MenuKind } from "./types";

export type MenuItemDraft = {
  id: string;
  title: string;
  price?: number;
  photo?: string;
  kind?: MenuKind;
  category?: MenuCategory;
  kindOptions: MenuKind[];
  selected: boolean;
  source: "photos" | "voice" | "video";
};

export function draftsFromMenuSpeech(
  raw: string,
  fallback?: { kind?: MenuKind; category?: MenuCategory },
): MenuItemDraft[] {
  const products = extractDishes(raw);
  const globalKinds = dishKindCandidates(raw);
  return products.map((item, index) => {
    const local = dishKindCandidates(item.title);
    const guessed = uniqueKinds([...(local.length ? local : globalKinds), fallback?.kind].filter(Boolean) as MenuKind[]);
    const locked = fallback?.kind;
    const options = locked ? [locked] : guessed.slice(0, 3);
    const kind = locked ?? options[0];
    return {
      id: `md-${index}-${slugId(item.title)}`,
      title: item.title,
      price: item.price,
      kind,
      category: parentOfMenuKind(kind) ?? fallback?.category,
      kindOptions: options,
      selected: true,
      source: "voice" as const,
    };
  });
}

export function pairMenuDraftsWithStills(
  drafts: MenuItemDraft[],
  stills: string[],
  source: MenuItemDraft["source"] = "photos",
): MenuItemDraft[] {
  if (!drafts.length && stills.length) {
    return [
      {
        id: "md-still",
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

function uniqueKinds(ids: MenuKind[]): MenuKind[] {
  const seen = new Set<MenuKind>();
  const out: MenuKind[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function slugId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "").slice(0, 8);
  return slug || "dish";
}
