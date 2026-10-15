import { ADMIN_AREAS, adminAreaById, adminAreaLabel, areasOfOblast, type AdminArea } from "./admin-areas";
import { DISTRICTS, GIS_CITIES, settlementById } from "./data";
import { haversineKm, nearestCityId } from "./geo";
import { OBLASTS, oblastOfCity, settlementsOfOblast, type OblastId } from "./places";
import type { Lang } from "./types";

/** Shop location fields the cascade reads and writes. Ids stay the same as before (CITIES / DISTRICTS / admin areas). */
export type PointPlace = { city: string; district?: string; lat?: number; lng?: number };

/** Bishkek is an oblast-level city: offer «г. Бишкек» itself next to its rayons (Osh oblast already has «г. Ош»). */
const BISHKEK_CITY: AdminArea = {
  id: "bishkek-city",
  oblast: "bishkek",
  kind: "city",
  name: "г. Бишкек",
  nameKy: "Бишкек шаары",
  lat: GIS_CITIES.bishkek.lat,
  lng: GIS_CITIES.bishkek.lng,
  cityId: "bishkek",
};

export function pointOblasts(): readonly OblastId[] {
  return OBLASTS;
}

/** Step 2 options: cities first, then rayons of the chosen oblast. */
export function pointAreasOf(oblast: string): AdminArea[] {
  const { cities, districts } = areasOfOblast(oblast);
  const head = oblast === "bishkek" ? [BISHKEK_CITY] : [];
  return [...head, ...cities, ...districts];
}

function areaById(id: string | undefined | null): AdminArea | undefined {
  if (!id) return undefined;
  if (id === BISHKEK_CITY.id) return BISHKEK_CITY;
  return adminAreaById(id);
}

function cityArea(city: string): AdminArea | undefined {
  if (city === "bishkek") return BISHKEK_CITY;
  return (
    ADMIN_AREAS.find((area) => area.kind === "city" && area.cityId === city) ??
    ADMIN_AREAS.find((area) => area.cityId === city)
  );
}

/** Reads an existing shop location (old city/district ids included) back into oblast + area. */
export function resolvePointPlace(place: PointPlace): { oblast?: OblastId; area?: AdminArea } {
  const byDistrict = areaById(place.district);
  if (byDistrict) return { oblast: byDistrict.oblast, area: byDistrict };
  const micro = DISTRICTS.find((row) => row.id === place.district);
  const city = micro?.city ?? place.city;
  const area = city && city !== "all" ? cityArea(city) : undefined;
  const oblast = area?.oblast ?? oblastOfCity(city);
  return { oblast, area };
}

/** Patch for a step-2 pick. Cities keep their CITIES id; rayons keep their admin id in `district`. */
export function pointPlaceForArea(area: AdminArea): PointPlace {
  if (area.cityId) {
    const gis = GIS_CITIES[area.cityId];
    return { city: area.cityId, district: undefined, lat: gis?.lat ?? area.lat, lng: gis?.lng ?? area.lng };
  }
  const settlement = settlementById(area.settlementId);
  return {
    city: settlement?.city ?? nearestCityId(area.lat, area.lng),
    district: area.id,
    lat: area.lat,
    lng: area.lng,
  };
}

/** Nearest rayon or city for a GPS fix (within 60 km). */
export function pointAreaForFix(lat: number, lng: number): AdminArea | null {
  let best: AdminArea | null = null;
  let bestKm = 60;
  for (const area of [BISHKEK_CITY, ...ADMIN_AREAS]) {
    const km = haversineKm(lat, lng, area.lat, area.lng);
    if (km < bestKm) {
      bestKm = km;
      best = area;
    }
  }
  return best;
}

export type PlaceSuggestion = { id: string; label: string; lat: number; lng: number };

/** Step 3 hints: known villages and city micro-districts that are closest to the chosen area. */
export function pointPlaceSuggestions(oblast: string, area: AdminArea | undefined, lang: Lang): PlaceSuggestion[] {
  if (!area) return [];
  const pool = pointAreasOf(oblast);
  const nearestIn = (lat: number, lng: number) =>
    pool.reduce<{ id: string; km: number }>(
      (best, row) => {
        const km = haversineKm(lat, lng, row.lat, row.lng);
        return km < best.km ? { id: row.id, km } : best;
      },
      { id: "", km: Infinity },
    ).id;
  const out: PlaceSuggestion[] = [];
  for (const s of settlementsOfOblast(oblast)) {
    if (s.id === area.settlementId) continue;
    if (nearestIn(s.lat, s.lng) !== area.id) continue;
    out.push({ id: `s-${s.id}`, label: lang === "ky" ? s.nameKy : s.name, lat: s.lat, lng: s.lng });
  }
  const adminIds = new Set(ADMIN_AREAS.map((row) => row.id));
  for (const d of DISTRICTS) {
    if (adminIds.has(d.id)) continue;
    if (oblastOfCity(d.city) !== oblast) continue;
    if (area.cityId && d.city !== area.cityId && nearestIn(d.lat, d.lng) !== area.id) continue;
    if (!area.cityId && nearestIn(d.lat, d.lng) !== area.id) continue;
    out.push({ id: `d-${d.id}`, label: lang === "ky" ? d.nameKy : d.name, lat: d.lat, lng: d.lng });
  }
  return out.slice(0, 12);
}

export function pointAreaLabel(area: AdminArea, lang: Lang): string {
  return adminAreaLabel(area, lang);
}

/** Display name for a stored `district` (old DISTRICTS id, admin rayon id or free text). */
export function pointDistrictLabel(id: string | undefined | null, lang: Lang): string {
  const raw = id?.trim() ?? "";
  if (!raw) return "";
  const micro = DISTRICTS.find((row) => row.id === raw);
  if (micro) return lang === "ky" ? micro.nameKy : micro.name;
  const area = areaById(raw);
  if (area) return adminAreaLabel(area, lang);
  return raw;
}

