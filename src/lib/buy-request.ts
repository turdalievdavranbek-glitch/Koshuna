import { adminAreaById } from "./admin-areas";
import { DISTRICTS } from "./data";
import { oblastOfCity, type OblastId } from "./places";
import { NEW_POINT_GROUPS } from "./shops";

/** Goods a point can sell. Service-only groups stay on the «Услуги» card. */
export const BUY_CATEGORIES = NEW_POINT_GROUPS;

export type BuyRequestStatus = "open" | "found" | "closed";

/** Calendar day in Kyrgyzstan, YYYY-MM-DD. */
export function todayBishkek(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** «10», «10 т», «10 мешков» → the integer, plus any words after it. */
export function parseBuyQuantity(raw: string): { quantity: number; unit: string } | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const match = /^(\d+)(.*)$/.exec(trimmed);
  if (!match) return null;
  const quantity = Number(match[1]);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return null;
  let unit = match[2].trim();
  if (/^[.,]\d/.test(unit)) return null;
  unit = unit.replace(/^[,:;]\s*/, "").trim();
  return { quantity, unit };
}

/** No unit column on a purchase request: keep those words on «Что нужно». */
export function buyRequestTextWithUnit(text: string, unit: string): string {
  const need = text.trim().replace(/[,;\s]+$/, "");
  const extra = unit.trim();
  if (!need || !extra) return need;
  return `${need}, ${extra}`;
}

export type BuyRequestRow = {
  id: string;
  category: string;
  text: string;
  quantity: string;
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
