import { NextResponse } from "next/server";
import { readPoint } from "@/lib/delivery";
import type { Lang } from "@/lib/types";
import { cartFor, setCartQty } from "@/server/delivery";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function langOf(value: string): Lang {
  return value === "ky" ? "ky" : "ru";
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const point = readPoint(url.searchParams.get("lat"), url.searchParams.get("lng"));
  const shops = await cartFor(user.id, langOf(user.lang), point?.lat ?? null, point?.lng ?? null);
  return json({ shops }, 200, { "Cache-Control": "no-store" });
}

export async function PUT(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ shopId?: unknown; productId?: unknown; qty?: unknown }>(req);
  if (!body || typeof body.shopId !== "string" || typeof body.productId !== "string" || typeof body.qty !== "number") {
    return json({ error: "bad-item" }, 400);
  }
  const done = await setCartQty(user.id, body.shopId, body.productId, body.qty);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
