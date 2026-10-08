export type LocateError = "insecure" | "unsupported" | "denied" | "off" | "timeout";

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

function ok(pos: Fix): LocateResult {
  return {
    ok: true,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 0,
  };
}

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
      timeout: 10000,
      maximumAge: high ? 60000 : 300000,
    });

  return (async () => {
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
