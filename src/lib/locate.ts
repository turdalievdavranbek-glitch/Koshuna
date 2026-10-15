import { inKonshuZone } from "./geo";

/** "outside": the phone is far from any place in Kyrgyzstan (VPN does not matter, GPS does). */
export type LocateError = "insecure" | "unsupported" | "denied" | "off" | "timeout" | "outside";

export type LocateResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; error: LocateError };

type Fix = { coords: { latitude: number; longitude: number; accuracy?: number } };

function readPosition(options: PositionOptions): Promise<Fix> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function asError(code: number | undefined): LocateError {
  if (code === 1) return "denied";
  if (code === 2) return "off";
  return "timeout";
}

/** Never turn a far-away fix into the nearest known place: report "outside" instead. */
function ok(pos: Fix): LocateResult {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  if (!inKonshuZone(lat, lng)) return { ok: false, error: "outside" };
  return { ok: true, lat, lng, accuracy: pos.coords.accuracy ?? 0 };
}

/** Whole attempt (precise + coarse) never takes longer than this. */
const TOTAL_MS = 15000;

/** Ask for a position only. Call this from a tap, never on page load. */
export function locate(opts?: { signal?: AbortSignal }): Promise<LocateResult> {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return Promise.resolve({ ok: false, error: "insecure" });
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ ok: false, error: "unsupported" });
  }
  const signal = opts?.signal;
  const once = (high: boolean) =>
    readPosition({
      enableHighAccuracy: high,
      timeout: high ? 8000 : 6000,
      maximumAge: high ? 60000 : 300000,
    });

  // Some WebViews never call back; the hard cap makes sure the button stops loading.
  let cap: ReturnType<typeof setTimeout> | undefined;
  const capped = new Promise<LocateResult>((resolve) => {
    cap = setTimeout(() => resolve({ ok: false, error: "timeout" }), TOTAL_MS);
  });

  const attempt = (async (): Promise<LocateResult> => {
    if (signal?.aborted) return { ok: false as const, error: "timeout" as const };
    try {
      return ok(await once(true));
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 1 || signal?.aborted) return { ok: false as const, error: asError(code) };
      try {
        return ok(await once(false));
      } catch (err2) {
        return { ok: false as const, error: asError((err2 as { code?: number }).code) };
      }
    }
  })();

  return Promise.race([attempt, capped]).finally(() => clearTimeout(cap));
}

/** Hint only. Android WebView often says "prompt" even after a denial, so never block on this. */
export async function locationPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const query = navigator.permissions?.query?.bind(navigator.permissions);
    if (!query) return "unknown";
    const status = await query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") return status.state;
    return "unknown";
  } catch {
    return "unknown";
  }
}
