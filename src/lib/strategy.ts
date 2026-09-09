import { formatSom } from "./data";
import type { ViewerPlace } from "./types";

export const VIEWER_PLACES: ViewerPlace[] = [
  "kyrgyzstan",
  "moscow",
  "almaty",
  "istanbul",
  "seoul",
  "dubai",
];

const TO_FOREIGN: Record<Exclude<ViewerPlace, "kyrgyzstan">, { symbol: string; perSom: number }> = {
  moscow: { symbol: "₽", perSom: 0.9 },
  almaty: { symbol: "₸", perSom: 6.4 },
  istanbul: { symbol: "₺", perSom: 0.47 },
  seoul: { symbol: "₩", perSom: 16 },
  dubai: { symbol: "AED", perSom: 0.042 },
};

export function isAbroad(place: ViewerPlace | null | undefined): boolean {
  return Boolean(place && place !== "kyrgyzstan");
}

export function parseViewerPlace(value: unknown): ViewerPlace {
  if (typeof value === "string" && (VIEWER_PLACES as string[]).includes(value)) {
    return value as ViewerPlace;
  }
  return "kyrgyzstan";
}

export function somToForeign(som: number, place: ViewerPlace): string | null {
  if (place === "kyrgyzstan") return null;
  const fx = TO_FOREIGN[place];
  const n = Math.round(som * fx.perSom);
  if (!n) return null;
  return `${formatSom(n)} ${fx.symbol}`;
}
