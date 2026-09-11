import { mineListings } from "./listing-owner";
import { MENU_CATEGORIES, MENU_KINDS, type Listing, type MenuCategory, type MenuKind, type RestaurantDish, type Shop, type User } from "./types";

export { MENU_CATEGORIES, MENU_KINDS };
export type { MenuCategory, MenuKind, RestaurantDish };

export const ALL_MENU_KINDS = MENU_CATEGORIES.flatMap((cat) => [...MENU_KINDS[cat]]) as MenuKind[];

export function isMenuCategory(id: string | null | undefined): id is MenuCategory {
  return !!id && (MENU_CATEGORIES as readonly string[]).includes(id);
}

export function isMenuKind(id: string | null | undefined): id is MenuKind {
  return !!id && (ALL_MENU_KINDS as readonly string[]).includes(id);
}

export function menuKindsOf(...cats: Array<MenuCategory | undefined | null>): MenuKind[] {
  const out: MenuKind[] = [];
  for (const cat of cats) {
    if (!cat || !isMenuCategory(cat)) continue;
    out.push(...MENU_KINDS[cat]);
  }
  return out;
}

export function parentOfMenuKind(id: string | null | undefined): MenuCategory | undefined {
  if (!id) return undefined;
  for (const cat of MENU_CATEGORIES) {
    if ((MENU_KINDS[cat] as readonly string[]).includes(id)) return cat;
  }
  return undefined;
}

export function mineRestaurants(
  all: Listing[],
  extra: Listing[],
  user: User | null,
  shops: Pick<Shop, "id" | "ownerPhone">[] = [],
): Listing[] {
  return mineListings(all, extra, user, shops).filter(
    (item) => item.section === "restaurants" && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed",
  );
}

export function groupMenu(dishes: RestaurantDish[]): Array<{ category: MenuCategory; items: RestaurantDish[] }> {
  const buckets = new Map<MenuCategory, RestaurantDish[]>();
  for (const item of dishes) {
    const cat = item.category ?? parentOfMenuKind(item.kind) ?? "other";
    const list = buckets.get(cat) ?? [];
    list.push(item);
    buckets.set(cat, list);
  }
  return MENU_CATEGORIES.filter((id) => buckets.has(id)).map((category) => ({
    category,
    items: buckets.get(category) ?? [],
  }));
}
