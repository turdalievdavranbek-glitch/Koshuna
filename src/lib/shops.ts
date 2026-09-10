import { GIS_CITIES } from "./data";
import { SHOP_CATEGORIES, type Shop, type ShopCategory, type ShopDraft, type ShopFilters, type ShopHours, type ShopProduct, type ShopStatus, type User } from "./types";

export { SHOP_CATEGORIES };
export type { ShopCategory };

export const SHOP_UNITS = ["piece", "kg", "meter", "liter", "pack", "other"] as const;
export const SHOP_STOCK = ["in", "out", "order", "ask"] as const;

export function isShopCategory(id: string | null | undefined): id is ShopCategory {
  return !!id && (SHOP_CATEGORIES as readonly string[]).includes(id);
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
      if (shop.category !== filters.category && !shop.extraCategories.includes(filters.category)) return false;
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
  if (dow === "Sun") return hours.sunday === undefined ? null : hours.sunday;
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

export function listingSectionForShop(category: ShopCategory): { section: "secondhand" | "construction"; category: string } | null {
  if (category === "construction") return { section: "construction", category: "cement" };
  if (category === "furniture") return { section: "secondhand", category: "furniture" };
  if (category === "electronics") return { section: "secondhand", category: "appliances" };
  if (category === "home") return { section: "secondhand", category: "home" };
  if (category === "apparel") return { section: "secondhand", category: "home" };
  return null;
}

export function toggleExtraCategory(shop: Pick<Shop, "category" | "extraCategories">, id: ShopCategory): ShopCategory[] {
  if (id === shop.category) return shop.extraCategories;
  if (shop.extraCategories.includes(id)) return shop.extraCategories.filter((x) => x !== id);
  return [...shop.extraCategories, id];
}

export function setPrimaryCategory(shop: Pick<Shop, "category" | "extraCategories">, id: ShopCategory): { category: ShopCategory; extraCategories: ShopCategory[] } {
  const extra = shop.extraCategories.filter((x) => x !== id);
  if (shop.category !== id) extra.unshift(shop.category);
  return { category: id, extraCategories: extra.filter((x, i, all) => all.indexOf(x) === i && x !== id) };
}

export function shopsOf(list: Shop[], user: User | null): Shop[] {
  if (!user) return [];
  return list.filter((s) => isOwnShop(s, user));
}

export function userHasShopBadge(list: Shop[], user: User | null): boolean {
  return shopsOf(list, user).some((s) => s.status === "active");
}

export function isPublicStatus(status: ShopStatus): boolean {
  return status === "active";
}
