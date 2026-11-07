import { NextResponse } from "next/server";
import { assertSessionSecret, getSessionUser, type SessionUser } from "./auth";

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export function csrfOk(req: Request): boolean {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/")) return true;
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  if (url.pathname.startsWith("/api/internal/")) return true;
  const site = req.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function guardCsrf(req: Request): NextResponse | null {
  if (!csrfOk(req)) return json({ error: "csrf" }, 403);
  return null;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export async function requireUser(req: Request): Promise<SessionUser | NextResponse> {
  try {
    assertSessionSecret();
  } catch (err) {
    const message = err instanceof Error ? err.message : "SESSION_SECRET";
    return json({ error: message }, 500);
  }
  const user = await getSessionUser(req);
  if (!user) return json({ error: "auth" }, 401);
  return user;
}
