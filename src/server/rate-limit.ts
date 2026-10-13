import { json } from "@/server/http";
import type { NextResponse } from "next/server";

/** Small in-memory fixed-window limiter (single pm2 process). Keys: "<bucket>:<user or ip>". */
const hits = new Map<string, { n: number; reset: number }>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, row] of hits) if (row.reset <= now) hits.delete(key);
}

/** true when the call is allowed. */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  sweep(now);
  const row = hits.get(key);
  if (!row || row.reset <= now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  row.n += 1;
  return row.n <= max;
}

/** Returns a 429 response when over the limit, otherwise null. */
export function limitOr429(key: string, max: number, windowMs: number): NextResponse | null {
  if (hit(key, max, windowMs)) return null;
  return json({ ok: false, error: "rate" }, 429, { "Retry-After": String(Math.ceil(windowMs / 1000)), "cache-control": "no-store" });
}

/** nginx sets X-Real-IP to the real peer; X-Forwarded-For's first hop can be spoofed by the client. */
export function limiterIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const fwd = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return fwd ? fwd.slice(0, 80) : "unknown";
}
