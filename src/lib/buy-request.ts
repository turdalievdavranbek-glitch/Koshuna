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
