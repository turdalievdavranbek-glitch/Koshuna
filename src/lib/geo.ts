import type { Lang } from "./types";
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

export function twoGisUrl(city: string, lng: number, lat: number) {
  const slug = gisCity(city).slug;
  return `https://2gis.kg/${slug}?m=${lng},${lat}/16`;
}
