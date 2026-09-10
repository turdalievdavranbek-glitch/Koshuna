import { GIS_CITIES } from "./data";
import {
  SHOP_CATEGORIES,
  SHOP_KINDS,
  type Shop,
  type ShopCategory,
  type ShopDraft,
  type ShopFilters,
  type ShopHours,
  type ShopKind,
  type ShopProduct,
  type ShopStatus,
  type User,
} from "./types";

export { SHOP_CATEGORIES, SHOP_KINDS };
export type { ShopCategory, ShopKind };

export const SHOP_UNITS = ["piece", "kg", "meter", "liter", "pack", "other"] as const;
export const SHOP_STOCK = ["in", "out", "order", "ask"] as const;
export const PRODUCT_REUSE_MAX = 5;

export const ALL_SHOP_KINDS = SHOP_CATEGORIES.flatMap((cat) => [...SHOP_KINDS[cat]]) as ShopKind[];

export function isShopCategory(id: string | null | undefined): id is ShopCategory {
  return !!id && (SHOP_CATEGORIES as readonly string[]).includes(id);
}

export function isShopKind(id: string | null | undefined): id is ShopKind {
  return !!id && (ALL_SHOP_KINDS as readonly string[]).includes(id);
}

export function shopKindsOf(...cats: Array<ShopCategory | undefined | null>): ShopKind[] {
  const out: ShopKind[] = [];
  for (const cat of cats) {
    if (!cat || !isShopCategory(cat)) continue;
    out.push(...SHOP_KINDS[cat]);
  }
  return out;
}

export function parentOfShopKind(id: string | null | undefined): ShopCategory | undefined {
  if (!id) return undefined;
  for (const cat of SHOP_CATEGORIES) {
    if ((SHOP_KINDS[cat] as readonly string[]).includes(id)) return cat;
  }
  return undefined;
}

export function filterShopParent(id: ShopCategory | ShopKind | "all"): ShopCategory | null {
  if (id === "all") return null;
  if (isShopCategory(id)) return id;
  return parentOfShopKind(id) ?? null;
}

export function pruneShopKinds(shop: Pick<Shop, "category" | "extraCategories" | "kinds">): ShopKind[] {
  const allowed = new Set(shopKindsOf(shop.category, ...shop.extraCategories));
  return (shop.kinds ?? []).filter((id) => allowed.has(id));
}

export function shopMatchesCategory(shop: Shop, filter: ShopCategory | ShopKind): boolean {
  if (isShopCategory(filter)) {
    return shop.category === filter || shop.extraCategories.includes(filter);
  }
  const parent = parentOfShopKind(filter);
  if (!parent) return false;
  if (shop.category !== parent && !shop.extraCategories.includes(parent)) return false;
  const selected = shop.kinds ?? [];
  const fromProducts = shop.products.map((item) => item.kind).filter((id): id is ShopKind => Boolean(id));
  if (!selected.length && !fromProducts.length) return true;
  return selected.includes(filter) || fromProducts.includes(filter);
}

export function emptyShopDraft(user: User): ShopDraft {
  const now = new Date().toISOString();
  return {
    id: `shop-${Date.now()}`,
    name: "",
    ownerPhone: user.phone,
    ownerName: user.name,
    category: "other",
    extraCategories: [],
    kinds: [],
    description: "",
    city: "bishkek",
    address: "",
    lat: GIS_CITIES.bishkek?.lat,
    lng: GIS_CITIES.bishkek?.lng,
    hours: undefined,
    hoursNote: "",
    contacts: { phone: user.phone, whatsapp: true, telegram: false },
    pickup: true,
    delivery: false,
    deliveryNote: "",
    status: "draft",
    products: [],
    createdAt: now,
    updatedAt: now,
    aiConfirmed: false,
    locked: {},
    pendingProducts: [],
  };
}

export function isOwnShop(shop: Pick<Shop, "ownerPhone">, user: User | null): boolean {
  if (!user?.phone) return false;
  return normalizePhone(shop.ownerPhone) === normalizePhone(user.phone);
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^996/, "").slice(-9);
}

export function hasShopContact(shop: Pick<Shop, "contacts">): boolean {
  return Boolean(shop.contacts.phone?.replace(/\D/g, "").length || shop.contacts.whatsapp || shop.contacts.telegram);
}

export function publicShop(shop: Shop): boolean {
  return shop.status === "active";
}

export function canSeeShop(shop: Shop, user: User | null): boolean {
  if (publicShop(shop)) return true;
  return isOwnShop(shop, user);
}

export function publicProduct(product: ShopProduct, shop: Shop): boolean {
  return publicShop(shop) && product.published !== false;
}

export function shopSearchBlob(shop: Shop): string {
  return `${shop.name} ${shop.description} ${shop.address} ${shop.hoursNote ?? ""}`.toLowerCase();
}

export function applyShopFilters(list: Shop[], filters: ShopFilters, cityFallback: string): Shop[] {
  const cityKey = filters.city !== "all" ? filters.city : cityFallback;
  const q = filters.query.trim().toLowerCase();
  return list.filter((shop) => {
    if (cityKey && cityKey !== "all" && shop.city !== cityKey) return false;
    if (filters.category !== "all") {
      if (!shopMatchesCategory(shop, filters.category)) return false;
    }
    if (q && !shopSearchBlob(shop).includes(q)) return false;
    return true;
  });
}

export function publicShops(list: Shop[]): Shop[] {
  return list.filter(publicShop);
}

export function parseHour(raw: string): { h: number; m: number } | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

export function shopOpenNow(hours: ShopHours | undefined, at = new Date()): boolean | null {
  if (!hours) return null;
  const usable = [hours.weekdays, hours.saturday, hours.sunday].some(
    (slot) => slot && parseHour(slot.open) && parseHour(slot.close),
  );
  if (!usable) return null;
  const slot = slotForDay(hours, at);
  if (slot === undefined) return null;
  if (slot === null) return false;
  const open = parseHour(slot.open);
  const close = parseHour(slot.close);
  if (!open || !close) return null;
  const mins = at.getHours() * 60 + at.getMinutes();
  const a = open.h * 60 + open.m;
  const b = close.h * 60 + close.m;
  if (b <= a) return mins >= a || mins < b;
  return mins >= a && mins < b;
}

function slotForDay(hours: ShopHours, at: Date): ShopHours["weekdays"] | null | undefined {
  const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Bishkek" }).format(at);
  if (dow === "Sat") return hours.saturday === undefined ? hours.weekdays : hours.saturday;
  if (dow === "Sun") return hours.sunday === undefined ? hours.weekdays : hours.sunday;
  return hours.weekdays;
}

export function nowInKg(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "Asia/Bishkek" });
  return new Date(s);
}

export function validPrice(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (n === 0) return undefined;
  return Math.round(n);
}

export function listingSectionForShop(
  category: ShopCategory,
  kind?: ShopKind | null,
): { section: "secondhand" | "construction"; category: string } | null {
  if (category === "food" || parentOfShopKind(kind) === "food") return null;
  if (category === "construction") return { section: "construction", category: "cement" };
  if (category === "furniture") return { section: "secondhand", category: "furniture" };
  if (category === "electronics") return { section: "secondhand", category: "appliances" };
  if (category === "home") return { section: "secondhand", category: "home" };
  if (category === "apparel") return { section: "secondhand", category: "home" };
  return null;
}

export function toggleExtraCategory(
  shop: Pick<Shop, "category" | "extraCategories" | "kinds">,
  id: ShopCategory,
): { extraCategories: ShopCategory[]; kinds: ShopKind[] } {
  const extra =
    id === shop.category
      ? shop.extraCategories
      : shop.extraCategories.includes(id)
        ? shop.extraCategories.filter((x) => x !== id)
        : [...shop.extraCategories, id];
  return { extraCategories: extra, kinds: pruneShopKinds({ ...shop, extraCategories: extra }) };
}

export function setPrimaryCategory(
  shop: Pick<Shop, "category" | "extraCategories" | "kinds">,
  id: ShopCategory,
): { category: ShopCategory; extraCategories: ShopCategory[]; kinds: ShopKind[] } {
  const extra = shop.extraCategories.filter((x) => x !== id);
  if (shop.category !== id && shop.category !== "other") extra.unshift(shop.category);
  const extraCategories = extra.filter((x, i, all) => all.indexOf(x) === i && x !== id);
  return { category: id, extraCategories, kinds: pruneShopKinds({ category: id, extraCategories, kinds: shop.kinds }) };
}

export function toggleShopKind(shop: Pick<Shop, "kinds">, id: ShopKind): ShopKind[] {
  const cur = shop.kinds ?? [];
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  return [...cur, id];
}

export function groupShopProducts(shop: Shop, products: ShopProduct[]): Array<{ id: ShopKind | "none"; items: ShopProduct[] }> {
  const order = shopKindsOf(shop.category, ...shop.extraCategories);
  const buckets = new Map<ShopKind | "none", ShopProduct[]>();
  for (const id of order) buckets.set(id, []);
  buckets.set("none", []);
  for (const item of products) {
    const key = item.kind && order.includes(item.kind) ? item.kind : "none";
    buckets.get(key)?.push(item);
  }
  const selected = new Set(shop.kinds ?? []);
  return [...buckets.entries()]
    .filter(([id, items]) => items.length > 0 || (id !== "none" && selected.has(id)))
    .map(([id, items]) => ({ id, items }));
}

export function shopsOf(list: Shop[], user: User | null): Shop[] {
  if (!user) return [];
  return list.filter((s) => isOwnShop(s, user));
}

export function userHasShopBadge(list: Shop[], user: User | null): boolean {
  return shopsOf(list, user).some((s) => s.status === "active");
}

export function hydrateShop<T extends Shop>(shop: T): T {
  const extraCategories = Array.isArray(shop.extraCategories) ? shop.extraCategories.filter(isShopCategory) : [];
  const category = isShopCategory(shop.category) ? shop.category : "other";
  return {
    ...shop,
    category,
    extraCategories,
    kinds: pruneShopKinds({ category, extraCategories, kinds: shop.kinds ?? [] }),
    products: (shop.products ?? []).map((item) => ({
      ...item,
      kind: isShopKind(item.kind) ? item.kind : undefined,
    })),
  };
}

export function isPublicStatus(status: ShopStatus): boolean {
  return status === "active";
}

export function assortmentKey(product: Pick<ShopProduct, "id" | "sourceId">): string {
  return product.sourceId || product.id;
}

export function assortmentUseCount(shop: Pick<Shop, "products">, key: string): number {
  return shop.products.filter((item) => item.published !== false && assortmentKey(item) === key).length;
}

export function canReuseAssortment(shop: Pick<Shop, "products">, key: string): boolean {
  return assortmentUseCount(shop, key) < PRODUCT_REUSE_MAX;
}

export function pickShopForKind(list: Shop[], user: User | null, parent: ShopCategory, kind?: ShopKind): Shop | undefined {
  const mine = shopsOf(list, user);
  if (!mine.length) return undefined;
  const scored = mine
    .map((shop) => {
      let score = shop.status === "active" ? 10 : 0;
      if (shop.category === parent) score += 4;
      if (shop.extraCategories.includes(parent)) score += 2;
      if (kind && (shop.kinds ?? []).includes(kind)) score += 3;
      return { shop, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.shop;
}

export function publicProductsInKind(
  list: Shop[],
  parent: ShopCategory,
  kind: ShopKind | "all",
): Array<{ shop: Shop; product: ShopProduct }> {
  const out: Array<{ shop: Shop; product: ShopProduct }> = [];
  for (const shop of list.filter(publicShop)) {
    for (const product of shop.products) {
      if (!publicProduct(product, shop)) continue;
        if (kind === "all") {
          if (product.category === parent || (product.kind && parentOfShopKind(product.kind) === parent)) out.push({ shop, product });
        } else if (product.kind === kind) {
        out.push({ shop, product });
      }
    }
  }
  return out;
}
