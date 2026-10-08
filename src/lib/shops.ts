import { DISTRICTS, GIS_CITIES } from "./data";
import { displayPhotoForProduct } from "./shop-photos";
import {
  SHOP_CATEGORIES,
  SHOP_KINDS,
  type Shop,
  type ShopCategory,
  type ShopDraft,
  type ShopFilters,
  SHOP_DAYS,
  type ShopDay,
  type ShopHours,
  type ShopHoursSlot,
  type ShopKind,
  type ShopProduct,
  type ShopStatus,
  type User,
  type Lang,
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
    id: `shop-${crypto.randomUUID()}`,
    name: "",
    ownerPhone: user.phone || "",
    ownerId: user.id,
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
    contacts: { phone: user.phone || "", whatsapp: true, telegram: false },
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

export function isOwnShop(shop: Pick<Shop, "ownerPhone"> & { ownerId?: string | null }, user: User | null): boolean {
  if (shop.ownerId && user?.id) return shop.ownerId === user.id;
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
  if (shop.status === "hidden") return false;
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

const WEEK_DAYS: ShopDay[] = ["mon", "tue", "wed", "thu", "fri"];

export type HoursPickerState = {
  days: ShopDay[];
  slot: ShopHoursSlot | null;
  allDay: boolean;
};

export type ShopHoursLabels = {
  days: Record<ShopDay, string>;
  daily: string;
  allDay: string;
};

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function cleanSlot(slot: ShopHoursSlot | null | undefined): ShopHoursSlot | null {
  if (!slot || typeof slot !== "object") return null;
  if (typeof slot.open !== "string" || typeof slot.close !== "string") return null;
  const open = parseHour(slot.open);
  const close = parseHour(slot.close);
  if (!open || !close) return null;
  return { open: padTime(open.h, open.m), close: padTime(close.h, close.m) };
}

function isAllDaySlot(slot: ShopHoursSlot | null): boolean {
  if (!slot) return false;
  return (slot.open === "00:00" && slot.close === "00:00") || (slot.open === "00:00" && slot.close === "23:59");
}

function knownDays(days: ShopDay[] | undefined): ShopDay[] {
  const set = new Set(days ?? []);
  return SHOP_DAYS.filter((id) => set.has(id));
}

function hasModernHours(hours: ShopHours): boolean {
  if (hours.allDay === true) return true;
  if (hours.days?.length) return true;
  return Boolean(cleanSlot(hours.slot));
}

/** Old weekdays/saturday/sunday rows, or a speech guess, become one range and day chips. */
export function hoursFromLegacy(hours: ShopHours | undefined | null): HoursPickerState {
  const blank: HoursPickerState = { days: [...WEEK_DAYS], slot: null, allDay: false };
  if (!hours) return blank;
  if (hasModernHours(hours)) {
    const days = knownDays(hours.days);
    const slot = cleanSlot(hours.slot);
    const allDay = hours.allDay === true || isAllDaySlot(slot);
    return {
      days: days.length ? days : [...WEEK_DAYS],
      slot: allDay ? null : slot,
      allDay,
    };
  }
  const week = hours.weekdays === null ? null : cleanSlot(hours.weekdays);
  const sat = hours.saturday === undefined ? week : hours.saturday === null ? null : cleanSlot(hours.saturday);
  const sun = hours.sunday === undefined ? week : hours.sunday === null ? null : cleanSlot(hours.sunday);
  const days: ShopDay[] = [];
  if (week) days.push(...WEEK_DAYS);
  if (sat) days.push("sat");
  if (sun) days.push("sun");
  const slot = week ?? sat ?? sun;
  if (!days.length || !slot) return blank;
  const allDay = isAllDaySlot(slot);
  return { days, slot: allDay ? null : slot, allDay };
}

function legacyFromDays(days: ShopDay[], slot: ShopHoursSlot): Pick<ShopHours, "weekdays" | "saturday" | "sunday"> | null {
  const on = new Set(days);
  const weekOn = WEEK_DAYS.every((id) => on.has(id));
  const weekOff = WEEK_DAYS.every((id) => !on.has(id));
  if (!weekOn && !weekOff) return null;
  return {
    weekdays: weekOn ? slot : null,
    saturday: on.has("sat") ? slot : null,
    sunday: on.has("sun") ? slot : null,
  };
}

/** Picker state → jsonb. Legacy weekdays/saturday/sunday are filled when the pattern still fits. */
export function hoursToStored(state: HoursPickerState): ShopHours | undefined {
  const days = knownDays(state.days);
  if (!days.length) return undefined;
  if (!state.allDay && !state.slot) return undefined;
  const slot = state.allDay ? { open: "00:00", close: "00:00" } : cleanSlot(state.slot);
  if (!slot) return undefined;
  const legacy = legacyFromDays(days, slot);
  const out: ShopHours = {
    days,
    slot: state.allDay ? null : slot,
    ...(state.allDay ? { allDay: true } : {}),
    ...(legacy ?? {}),
  };
  return out;
}

export function sanitizeShopHours(raw: unknown): ShopHours | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: ShopHours = {};
  const takeSlot = (key: "weekdays" | "saturday" | "sunday" | "slot") => {
    if (!(key in src)) return;
    const value = src[key];
    if (value === null) {
      out[key] = null;
      return;
    }
    const slot = cleanSlot(value as ShopHoursSlot);
    if (slot) out[key] = slot;
  };
  takeSlot("weekdays");
  takeSlot("saturday");
  takeSlot("sunday");
  takeSlot("slot");
  if (Array.isArray(src.days)) {
    const days: ShopDay[] = [];
    for (const id of src.days) {
      if (typeof id === "string" && (SHOP_DAYS as readonly string[]).includes(id) && !days.includes(id as ShopDay)) {
        days.push(id as ShopDay);
      }
    }
    if (days.length) out.days = knownDays(days);
  }
  if (src.allDay === true || src.allDay === false) out.allDay = src.allDay;
  return Object.keys(out).length ? out : undefined;
}

export function hasShopHours(hours: ShopHours | undefined | null): boolean {
  if (!hours) return false;
  if (hours.allDay && knownDays(hours.days).length) return true;
  if (cleanSlot(hours.slot) && knownDays(hours.days).length) return true;
  return [hours.weekdays, hours.saturday, hours.sunday].some((slot) => cleanSlot(slot ?? undefined));
}

function dayInBishkek(at: Date): ShopDay {
  const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Bishkek" }).format(at);
  const map: Record<string, ShopDay> = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
  return map[dow] ?? "mon";
}

function openDuring(slot: ShopHoursSlot, at: Date): boolean | null {
  const open = parseHour(slot.open);
  const close = parseHour(slot.close);
  if (!open || !close) return null;
  const mins = at.getHours() * 60 + at.getMinutes();
  const a = open.h * 60 + open.m;
  const b = close.h * 60 + close.m;
  if (b <= a) return mins >= a || mins < b;
  return mins >= a && mins < b;
}

export function shopOpenNow(hours: ShopHours | undefined, at = new Date()): boolean | null {
  if (!hours) return null;
  if (hasModernHours(hours)) {
    const days = knownDays(hours.days);
    if (!days.length) return null;
    if (!days.includes(dayInBishkek(at))) return false;
    if (hours.allDay || isAllDaySlot(cleanSlot(hours.slot))) return true;
    const slot = cleanSlot(hours.slot);
    if (!slot) return null;
    return openDuring(slot, at);
  }
  const usable = [hours.weekdays, hours.saturday, hours.sunday].some((slot) => cleanSlot(slot ?? undefined));
  if (!usable) return null;
  const slot = slotForDay(hours, at);
  if (slot === undefined) return null;
  if (slot === null) return false;
  return openDuring(slot, at);
}

function slotForDay(hours: ShopHours, at: Date): ShopHours["weekdays"] | null | undefined {
  const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Bishkek" }).format(at);
  if (dow === "Sat") return hours.saturday === undefined ? hours.weekdays : hours.saturday;
  if (dow === "Sun") return hours.sunday === undefined ? hours.weekdays : hours.sunday;
  return hours.weekdays;
}

function groupDayLabels(days: ShopDay[], label: (id: ShopDay) => string): string {
  const idx = days.map((id) => SHOP_DAYS.indexOf(id)).filter((n) => n >= 0).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j += 1;
    const start = label(SHOP_DAYS[idx[i]]);
    const end = label(SHOP_DAYS[idx[j]]);
    parts.push(i === j ? start : `${start}–${end}`);
    i = j + 1;
  }
  return parts.join(", ");
}

export function formatShopHours(hours: ShopHours | undefined | null, labels: ShopHoursLabels): string {
  if (!hours || !hasShopHours(hours)) return "";
  const state = hoursFromLegacy(hours);
  if (!state.allDay && !state.slot) return "";
  const days = knownDays(state.days);
  if (!days.length) return "";
  const dayText = days.length === SHOP_DAYS.length ? labels.daily : groupDayLabels(days, (id) => labels.days[id]);
  if (state.allDay) {
    if (days.length === SHOP_DAYS.length) return labels.allDay;
    const word = labels.allDay.charAt(0).toLowerCase() + labels.allDay.slice(1);
    return `${dayText} ${word}`;
  }
  const slot = state.slot;
  if (!slot) return "";
  return `${dayText} ${slot.open}–${slot.close}`;
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

export function validQuantity(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function listingSectionForShop(
  category: ShopCategory,
  kind?: ShopKind | null,
): { section: "shops"; category: string } {
  const parent = parentOfShopKind(kind) ?? category;
  return {
    section: "shops",
    category: kind && isShopKind(kind) ? kind : parent,
  };
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
  return list.filter((s) => isOwnShop(s, user) && s.status !== "hidden");
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
    products: (shop.products ?? []).map((item) => {
      const kind = isShopKind(item.kind) ? item.kind : undefined;
      const next = { ...item, kind, quantity: validQuantity(item.quantity) };
      return { ...next, photo: displayPhotoForProduct(next) };
    }),
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

/** Groups a new point may use. Service-like groups stay on the «Услуги» card. */
export const NEW_POINT_GROUPS: ShopCategory[] = [
  "food",
  "farm",
  "construction",
  "furniture",
  "electronics",
  "apparel",
  "home",
  "books",
  "pets",
  "health",
  "other",
];

export const POINT_HIDDEN_GROUPS: ShopCategory[] = ["beauty", "repair", "travel"];

export const POINT_HIDDEN_KINDS: ShopKind[] = ["health-clinic", "health-dentist"];

export function pointGroupsFor(shop: Pick<Shop, "category" | "extraCategories">, creating: boolean): ShopCategory[] {
  if (creating) return [...NEW_POINT_GROUPS];
  const extra = [shop.category, ...(shop.extraCategories ?? [])].filter(
    (id): id is ShopCategory => isShopCategory(id) && !NEW_POINT_GROUPS.includes(id),
  );
  return [...NEW_POINT_GROUPS, ...extra];
}

export function pointKindsFor(category: ShopCategory, current: readonly ShopKind[] | undefined, creating: boolean): ShopKind[] {
  return shopKindsOf(category).filter((id) => {
    if (!(POINT_HIDDEN_KINDS as readonly string[]).includes(id)) return true;
    if (creating) return false;
    return (current ?? []).includes(id);
  });
}

export function landmarksFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.slice(0, 60))
    .slice(0, 3);
}

export function shopDistrictName(id: string | undefined | null, lang: Lang): string {
  const raw = id?.trim() ?? "";
  if (!raw) return "";
  const row = DISTRICTS.find((item) => item.id === raw);
  if (!row) return raw;
  return lang === "ky" ? row.nameKy : row.name;
}

export function shopLandmarkLine(shop: { landmarks?: string[] | null; address?: string | null }): string {
  const marks = (shop.landmarks ?? []).map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  if (marks.length) return marks.join(" · ");
  return (shop.address ?? "").trim();
}

export function shopHasPointPlace(shop: { district?: string | null; landmarks?: string[] | null }): boolean {
  return Boolean(shop.district?.trim() || (shop.landmarks ?? []).some((item) => item.trim()));
}

/** «район · ориентир» when the new fields are set. Otherwise the old «город, адрес» line. */
export function shopPlaceHeadline(
  shop: Pick<Shop, "district" | "landmarks" | "address">,
  cityLabel: string,
  lang: Lang,
): string {
  if (shopHasPointPlace(shop)) {
    return [shopDistrictName(shop.district, lang), shopLandmarkLine(shop)].filter(Boolean).join(" · ");
  }
  return [cityLabel, (shop.address ?? "").trim()].filter(Boolean).join(", ");
}

export function shopPointSubtitle(
  shop: Pick<Shop, "venueKind" | "district" | "landmarks" | "address" | "city">,
  venueShop: string,
  venueStall: string,
  cityLabel: string,
  lang: Lang,
): string {
  const venue = shop.venueKind === "stall" ? venueStall : shop.venueKind === "shop" ? venueShop : "";
  const place = shopHasPointPlace(shop)
    ? [shopDistrictName(shop.district, lang), shopLandmarkLine(shop)].filter(Boolean).join(" · ")
    : [cityLabel, (shop.address ?? "").trim()].filter(Boolean).join(" · ");
  return [venue, place].filter(Boolean).join(" · ");
}

export function shopDeliveryLine(
  shop: { delivery?: boolean; deliveryFree?: boolean | null },
  free: string,
  paid: string,
): string | null {
  if (!shop.delivery) return null;
  if (shop.deliveryFree === true) return free;
  if (shop.deliveryFree === false) return paid;
  return null;
}

function capText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Trim the point fields. No new database columns: they already exist on shops. */
export function sanitizeShopPointFields(shop: Shop): Shop {
  const landmarks = (Array.isArray(shop.landmarks) ? shop.landmarks : [])
    .map((item) => capText(item, 60))
    .filter(Boolean)
    .slice(0, 3);
  const district = capText(shop.district, 60);
  const kindOther = capText(shop.kindOther, 40);
  const delivery = Boolean(shop.delivery);
  const deliveryFree = delivery && typeof shop.deliveryFree === "boolean" ? shop.deliveryFree : undefined;
  const deliveryDistricts = delivery
    ? (Array.isArray(shop.deliveryDistricts) ? shop.deliveryDistricts : [])
        .map((item) => capText(item, 60))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  return {
    ...shop,
    landmarks: landmarks.length ? landmarks : undefined,
    district: district || undefined,
    kindOther: kindOther || undefined,
    deliveryFree,
    deliveryDistricts,
    address: landmarks.length ? landmarks.join(" · ") : typeof shop.address === "string" ? shop.address : "",
  };
}
