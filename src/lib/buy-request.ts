import { adminAreaById } from "./admin-areas";
import { DISTRICTS } from "./data";
import { oblastOfCity, type OblastId } from "./places";
import { NEW_POINT_GROUPS } from "./shops";

/** Goods a point can sell. Service-only groups stay on the «Услуги» card. */
export const BUY_CATEGORIES = NEW_POINT_GROUPS;

export type BuyRequestStatus = "open" | "found" | "closed";

/** шт, кг, т, м, п.м., м², м³, л, мешок, упаковка. Stored as these ids. */
export const BUY_UNITS = ["piece", "kg", "ton", "meter", "linear", "sqm", "cbm", "liter", "bag", "pack"] as const;
export type BuyUnit = (typeof BUY_UNITS)[number];
export const BUY_UNIT_DEFAULT: BuyUnit = "piece";

/** Longer units first so «м²» is not read as «м». */
const BUY_UNIT_PATTERNS: { id: BuyUnit; re: RegExp }[] = [
  { id: "sqm", re: /^(?:м²|м2|кв\.?\s*м\.?)$/iu },
  { id: "cbm", re: /^(?:м³|м3|куб\.?\s*м\.?)$/iu },
  { id: "linear", re: /^(?:п\.?\s*м\.?|пог\.?\s*м\.?)$/iu },
  { id: "piece", re: /^(?:шт\.?|штук[аи]?|штуки|даана)$/iu },
  { id: "kg", re: /^(?:кг\.?|кило(?:грамм(?:а|ов)?)?|kg)$/iu },
  { id: "ton", re: /^(?:тонна|тонны|тонн|т\.?)$/iu },
  { id: "meter", re: /^(?:метр(?:а|ов)?|м\.?)$/iu },
  { id: "liter", re: /^(?:литр(?:а|ов)?|л\.?)$/iu },
  { id: "bag", re: /^(?:мешок|мешка|мешков|мешки|кап)$/iu },
  { id: "pack", re: /^(?:упаковка|упаковки|упаковок|упак\.?|таңгак)$/iu },
];

export function isBuyUnit(value: string): value is BuyUnit {
  return (BUY_UNITS as readonly string[]).includes(value);
}

export function matchBuyUnit(raw: string): BuyUnit | null {
  const text = raw.trim().replace(/\s+/g, " ").toLowerCase();
  if (!text) return null;
  for (const row of BUY_UNIT_PATTERNS) {
    if (row.re.test(text)) return row.id;
  }
  return null;
}

/** Calendar day in Kyrgyzstan, YYYY-MM-DD. */
export function todayBishkek(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The field keeps digits only. «500 шт» still yields the number and, when the
 * word is a known unit, that unit.
 */
export function readBuyQuantityInput(raw: string): { quantity: string; unit: BuyUnit | null } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return { quantity: "", unit: null };
  const match = /^(\d+)\s*(.*)$/.exec(trimmed);
  if (!match) return { quantity: "", unit: matchBuyUnit(trimmed) };
  const rest = match[2].trim();
  const digits = match[1].slice(0, 7);
  const n = Number(digits);
  if (/^[.,]\d/.test(rest)) return { quantity: String(n), unit: null };
  return { quantity: String(n), unit: rest ? matchBuyUnit(rest) : null };
}

export function parseBuyQuantity(raw: string): { quantity: number; unit: BuyUnit | null } | null {
  const read = readBuyQuantityInput(raw);
  if (!/^\d+$/.test(read.quantity)) return null;
  const quantity = Number(read.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return null;
  return { quantity, unit: read.unit };
}

export function formatBuyQuantity(value: string | null | undefined): string {
  if (!value) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return String(n);
}

export function buyRequestAmount(quantity: string, unit: string | null | undefined, labels: Record<string, string>): string {
  const n = quantity.trim();
  if (!n) return "";
  const label = unit ? (labels[unit] || unit).trim() : "";
  return label ? `${n} ${label}` : n;
}

/** Request text plus quantity, for the chat card and the thread list. */
export function buyRequestChatTitle(
  title: string,
  quantity: string | null | undefined,
  unit: string | null | undefined,
  labels: Record<string, string>,
): string {
  if (quantity == null && !unit) return title;
  const amount = buyRequestAmount(quantity ?? "", unit, labels);
  return [title.trim(), amount].filter(Boolean).join(" · ");
}

export type BuyRequestRow = {
  id: string;
  category: string;
  text: string;
  quantity: string;
  unit: string;
  oblast: string;
  district: string;
  deadline: string;
  needsDelivery: boolean;
  status: BuyRequestStatus;
  createdAt: string;
  buyerName?: string;
  shopId?: string;
};

/** Oblast of a point: official district first, then the city the point saved. */
export function oblastOfPoint(city: string | null | undefined, district: string | null | undefined): OblastId | undefined {
  const area = adminAreaById(district ?? undefined);
  if (area) return area.oblast;
  const fromCity = oblastOfCity(city);
  if (fromCity) return fromCity;
  const row = DISTRICTS.find((item) => item.id === district);
  return row ? oblastOfCity(row.city) : undefined;
}

export function pointMatchesRequest(
  point: { city: string; district?: string | null; category: string; extraCategories?: string[] | null },
  request: { category: string; oblast: string },
): boolean {
  const cats = [point.category, ...(point.extraCategories ?? [])];
  if (!cats.includes(request.category)) return false;
  return oblastOfPoint(point.city, point.district) === request.oblast;
}
