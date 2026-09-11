import type { Lang, MeetupSpot } from "./types";
import { DISTRICTS, GIS_CITIES } from "./data";

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function gisCity(id: string) {
  return GIS_CITIES[id] ?? GIS_CITIES.bishkek;
}

export function nearestCityId(lat: number, lng: number): string {
  let best = "bishkek";
  let dist = Infinity;
  for (const [id, c] of Object.entries(GIS_CITIES)) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < dist) {
      dist = km;
      best = id;
    }
  }
  return best;
}

export function nearestDistrict(lat: number, lng: number, city?: string) {
  const pool = city && city !== "all" ? DISTRICTS.filter((d) => d.city === city) : DISTRICTS;
  if (!pool.length) return null;
  return pool.reduce((best, d) =>
    haversineKm(lat, lng, d.lat, d.lng) < haversineKm(lat, lng, best.lat, best.lng) ? d : best,
  );
}

export function districtLabel(
  d: (typeof DISTRICTS)[number],
  lang: Lang,
): string {
  if (lang === "ky") return d.nameKy;
  return d.name;
}

export function hasCoords(point?: { lat?: number; lng?: number } | null): point is { lat: number; lng: number } {
  return point != null && point.lat != null && point.lng != null && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

/** Well-known meetup spots so a listing pin is not only the city centre. */
const MEETUP_POINTS: Partial<Record<MeetupSpot, { lat: number; lng: number }>> = {
  tsum: { lat: 42.8748, lng: 74.5985 },
  philharmonic: { lat: 42.8766, lng: 74.6086 },
  dordoi: { lat: 42.9162, lng: 74.6164 },
  "ala-too": { lat: 42.8766, lng: 74.6037 },
  globus: { lat: 42.8744, lng: 74.5898 },
  "osh-bazaar": { lat: 40.5283, lng: 72.7985 },
  navoi: { lat: 40.5318, lng: 72.8052 },
};

export function meetupCoords(spot: MeetupSpot | undefined, city: string) {
  if (!spot || spot === "home" || spot === "market") return gisCity(city);
  return MEETUP_POINTS[spot] ?? gisCity(city);
}

export function publishCoords(input: {
  lat?: number;
  lng?: number;
  city: string;
  meetupSpot?: MeetupSpot;
  fallbackLat?: number;
  fallbackLng?: number;
}): { lat: number; lng: number } {
  if (hasCoords(input)) return { lat: input.lat, lng: input.lng };
  if (input.meetupSpot) return meetupCoords(input.meetupSpot, input.city);
  if (input.fallbackLat != null && input.fallbackLng != null) {
    return { lat: input.fallbackLat, lng: input.fallbackLng };
  }
  const city = gisCity(input.city);
  return { lat: city.lat, lng: city.lng };
}

/** Deep-link that opens 2GIS with a pin on the coordinates (not a 2GIS firm card). */
export function twoGisUrl(city: string, lng: number, lat: number) {
  const slug = gisCity(city).slug;
  return `https://2gis.kg/${slug}/geo/${lng}%2C${lat}`;
}

export function listingMapPath(id: string) {
  return `/map?listing=${encodeURIComponent(id)}`;
}

export function mapPointPath(lat: number, lng: number, city?: string) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (city) q.set("city", city);
  return `/map?${q.toString()}`;
}
