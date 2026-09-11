import {
  CITIES,
  DISTRICTS,
  SETTLEMENTS,
  settlementById,
  settlementLabel,
} from "./data";
import { districtLabel, haversineKm, nearestCityId } from "./geo";
import type { Filters, Lang } from "./types";

export const OBLASTS = [
  "bishkek",
  "osh",
  "chuy",
  "issyk-kul",
  "naryn",
  "talas",
  "jalal-abad",
  "osh-oblast",
  "batken",
] as const;
export type OblastId = (typeof OBLASTS)[number];

export const OBLAST_RU: Record<string, string> = {
  bishkek: "Бишкек",
  osh: "Ош",
  chuy: "Чуйская область",
  "issyk-kul": "Иссык-Кульская область",
  naryn: "Нарынская область",
  talas: "Таласская область",
  "jalal-abad": "Джалал-Абадская область",
  "osh-oblast": "Ошская область",
  batken: "Баткенская область",
};
export const OBLAST_KY: Record<string, string> = {
  bishkek: "Бишкек",
  osh: "Ош",
  chuy: "Чүй облусу",
  "issyk-kul": "Ысык-Көл облусу",
  naryn: "Нарын облусу",
  talas: "Талас облусу",
  "jalal-abad": "Жалал-Абад облусу",
  "osh-oblast": "Ош облусу",
  batken: "Баткен облусу",
};
export const OBLAST_UZ: Record<string, string> = {
  bishkek: "Bishkek",
  osh: "Oʻsh",
  chuy: "Chuy viloyati",
  "issyk-kul": "Issiqkoʻl viloyati",
  naryn: "Naryn viloyati",
  talas: "Talas viloyati",
  "jalal-abad": "Jalolobod viloyati",
  "osh-oblast": "Oʻsh viloyati",
  batken: "Batken viloyati",
};

const CITY_OBLAST: Record<string, OblastId> = {
  bishkek: "bishkek",
  osh: "osh",
  "jalal-abad": "jalal-abad",
  karakol: "issyk-kul",
  "cholpon-ata": "issyk-kul",
  naryn: "naryn",
  talas: "talas",
  batken: "batken",
  tokmok: "chuy",
  kochkor: "issyk-kul",
};

const SETTLEMENT_OBLAST: Record<string, OblastId> = {
  sokuluk: "chuy",
  kant: "chuy",
  belovodskoe: "chuy",
  uzgen: "osh-oblast",
  "kara-suu": "osh-oblast",
  suzak: "jalal-abad",
  "at-bashy": "naryn",
  balykchy: "issyk-kul",
};

export type PlacePatch = {
  city: string;
  oblast: string;
  settlement: string;
  aiylOnly: boolean;
  locLat: number | null;
  locLng: number | null;
  locLabel: string | null;
};

export function isOblastId(id: string | null | undefined): id is OblastId {
  return Boolean(id && (OBLASTS as readonly string[]).includes(id));
}

export function isCityOblast(id: string) {
  return id === "bishkek" || id === "osh";
}

export function oblastOfCity(city: string | null | undefined): OblastId | undefined {
  if (!city || city === "all") return undefined;
  return CITY_OBLAST[city];
}

export function oblastOfListing(item: { city: string; settlement?: string }): OblastId | undefined {
  if (item.settlement && SETTLEMENT_OBLAST[item.settlement]) return SETTLEMENT_OBLAST[item.settlement];
  return oblastOfCity(item.city);
}

export function citiesOfOblast(oblast: string): string[] {
  return CITIES.filter((id) => id !== "all" && CITY_OBLAST[id] === oblast);
}

export function districtsOfOblast(oblast: string) {
  return DISTRICTS.filter((d) => CITY_OBLAST[d.city] === oblast);
}

export function settlementsOfOblast(oblast: string) {
  return SETTLEMENTS.filter((s) => (SETTLEMENT_OBLAST[s.id] ?? CITY_OBLAST[s.city]) === oblast);
}

export function clearPlace(): PlacePatch {
  return {
    city: "all",
    oblast: "any",
    settlement: "any",
    aiylOnly: false,
    locLat: null,
    locLng: null,
    locLabel: null,
  };
}

export function placeOblast(oblast: string): PlacePatch {
  if (isCityOblast(oblast)) return placeCity(oblast);
  return {
    ...clearPlace(),
    city: "all",
    oblast,
  };
}

export function placeCity(city: string): PlacePatch {
  return {
    ...clearPlace(),
    city,
  };
}

export function placeDistrict(d: (typeof DISTRICTS)[number], lang: Lang): PlacePatch {
  return {
    city: d.city,
    oblast: "any",
    settlement: "any",
    aiylOnly: false,
    locLat: d.lat,
    locLng: d.lng,
    locLabel: districtLabel(d, lang),
  };
}

export function placeSettlement(s: (typeof SETTLEMENTS)[number], lang: Lang): PlacePatch {
  return {
    city: s.city,
    oblast: "any",
    settlement: s.id,
    aiylOnly: false,
    locLat: s.lat,
    locLng: s.lng,
    locLabel: settlementLabel(s, lang),
  };
}

export function placeFromGeo(lat: number, lng: number, lang: Lang): PlacePatch {
  let bestSettlement: (typeof SETTLEMENTS)[number] | null = null;
  let bestSettlementKm = Infinity;
  for (const s of SETTLEMENTS) {
    const km = haversineKm(lat, lng, s.lat, s.lng);
    if (km < bestSettlementKm) {
      bestSettlementKm = km;
      bestSettlement = s;
    }
  }
  if (bestSettlement && bestSettlementKm <= 12) return placeSettlement(bestSettlement, lang);

  const city = nearestCityId(lat, lng);
  const districts = DISTRICTS.filter((d) => d.city === city);
  let bestDistrict = districts[0];
  let bestDistrictKm = Infinity;
  for (const d of districts) {
    const km = haversineKm(lat, lng, d.lat, d.lng);
    if (km < bestDistrictKm) {
      bestDistrictKm = km;
      bestDistrict = d;
    }
  }
  if (bestDistrict && bestDistrictKm <= 6) return placeDistrict(bestDistrict, lang);

  return {
    ...placeCity(city),
    locLat: lat,
    locLng: lng,
  };
}

export function applyPlace(setCity: (city: string) => void, setFilters: (patch: Partial<Filters>) => void, place: PlacePatch) {
  setCity(place.city);
  setFilters({
    city: place.city,
    oblast: place.oblast,
    settlement: place.settlement,
    aiylOnly: place.aiylOnly,
    locLat: place.locLat,
    locLng: place.locLng,
    locLabel: place.locLabel,
  });
}

export type PlaceHit = {
  id: string;
  kind: "oblast" | "city" | "district" | "settlement";
  label: string;
  href?: string;
  place: PlacePatch;
};

export function searchPlaces(
  query: string,
  lang: Lang,
  cities: Record<string, string>,
  oblasts: Record<string, string>,
): PlaceHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: PlaceHit[] = [];
  for (const id of OBLASTS) {
    const label = oblasts[id] ?? id;
    if (label.toLowerCase().includes(q)) {
      hits.push({ id: `oblast-${id}`, kind: "oblast", label, href: `/location/${id}`, place: placeOblast(id) });
    }
  }
  for (const id of CITIES) {
    if (id === "all") continue;
    const label = cities[id] ?? id;
    if (label.toLowerCase().includes(q)) {
      hits.push({ id: `city-${id}`, kind: "city", label, place: placeCity(id) });
    }
  }
  for (const d of DISTRICTS) {
    const label = districtLabel(d, lang);
    if (label.toLowerCase().includes(q)) {
      hits.push({ id: `district-${d.id}`, kind: "district", label, place: placeDistrict(d, lang) });
    }
  }
  for (const s of SETTLEMENTS) {
    const label = settlementLabel(s, lang);
    if (label.toLowerCase().includes(q)) {
      hits.push({ id: `settlement-${s.id}`, kind: "settlement", label, place: placeSettlement(s, lang) });
    }
  }
  return hits;
}

export function locationLineLabel(
  lang: Lang,
  city: string,
  filters: Pick<Filters, "oblast" | "settlement" | "locLabel" | "city">,
  cities: Record<string, string>,
  oblasts: Record<string, string>,
  refine: string,
  countryHint: string,
): string {
  if (filters.settlement && filters.settlement !== "any") {
    const s = settlementById(filters.settlement);
    if (s) return settlementLabel(s, lang);
  }
  if (filters.locLabel) {
    const cityId = filters.city !== "all" ? filters.city : city;
    const cityName = cityId && cityId !== "all" ? cities[cityId] : "";
    if (cityName && !filters.locLabel.includes(cityName)) return `${cityName}, ${filters.locLabel}`;
    return filters.locLabel;
  }
  const cityId = filters.city !== "all" ? filters.city : city;
  if (cityId && cityId !== "all") return `${cities[cityId]}, ${refine}`;
  if (filters.oblast && filters.oblast !== "any" && oblasts[filters.oblast]) {
    return `${oblasts[filters.oblast]}, ${refine}`;
  }
  return countryHint;
}
