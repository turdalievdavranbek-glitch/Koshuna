import type { Dict } from "./i18n";
import type { MenuCategory, MenuKind } from "./types";

export function menuKindLabel(t: Dict, id: string | undefined | null): string {
  if (!id) return "";
  return t.menuKinds[id] || t.menuCats[id] || id;
}

export function menuCatLabel(t: Dict, id: MenuCategory | MenuKind | string | undefined | null): string {
  if (!id) return "";
  return t.menuCats[id] || t.menuKinds[id] || id;
}
