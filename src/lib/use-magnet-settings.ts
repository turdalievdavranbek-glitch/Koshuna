"use client";

import { useEffect, useState } from "react";
import { FEATURES } from "./features";
import { MAGNET_DEFAULTS, parseMagnetSettings, type MagnetSettings } from "./magnet-config";

let cached: MagnetSettings | undefined;
let inflight: Promise<MagnetSettings> | null = null;

function loadMagnetSettings(): Promise<MagnetSettings> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const config = body && typeof body === "object" ? (body as { config?: unknown }).config : undefined;
        const parsed = parseMagnetSettings(config);
        // FEATURES.magnets=false hides every magnet, whatever the admin config says.
        cached = FEATURES.magnets ? parsed : { ...parsed, enabled: false };
        return cached;
      })
      .catch(() => {
        cached = { ...MAGNET_DEFAULTS, ...(FEATURES.magnets ? {} : { enabled: false }) };
        return cached;
      });
  }
  return inflight;
}

/** null until /api/config has answered. Defaults apply when a key is missing or the request fails. */
export function useMagnetSettings(): MagnetSettings | null {
  const [settings, setSettings] = useState<MagnetSettings | null>(null);
  useEffect(() => {
    let dead = false;
    void loadMagnetSettings().then((next) => {
      if (!dead) setSettings(next);
    });
    return () => {
      dead = true;
    };
  }, []);
  return settings;
}
