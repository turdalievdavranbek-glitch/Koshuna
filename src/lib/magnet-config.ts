/** Public switches in app_config. Missing keys use these defaults — no migration. */
export const MAGNET_KEYS = {
  enabled: "magnets_enabled",
  minListings: "magnet_min_listings",
  priceMinN: "price_min_n",
} as const;

export const MAGNET_DEFAULTS = {
  enabled: true,
  minListings: 20,
  priceMinN: 5,
} as const;

export type MagnetSettings = {
  enabled: boolean;
  /** Public listings in the selected region before any home magnet shows. */
  minListings: number;
  /** Rows in price_stats below this are not shown. */
  priceMinN: number;
};

export function parseMagnetSettings(config: unknown): MagnetSettings {
  const bag = config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  return {
    enabled: configBool(bag[MAGNET_KEYS.enabled], MAGNET_DEFAULTS.enabled),
    minListings: configInt(bag[MAGNET_KEYS.minListings], MAGNET_DEFAULTS.minListings),
    priceMinN: configInt(bag[MAGNET_KEYS.priceMinN], MAGNET_DEFAULTS.priceMinN),
  };
}

function configBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function configInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}
