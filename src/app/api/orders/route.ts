import { NextResponse } from "next/server";
import { readPoint } from "@/lib/delivery";
import type { Lang } from "@/lib/types";
import { listBuyerOrders, placeOrder } from "@/server/delivery";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function langOf(value: string): Lang {
  return value === "ky" ? "ky" : "ru";
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const orders = await listBuyerOrders(user.id, langOf(user.lang));
  return json({ orders }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ shopId?: unknown; address?: unknown; phone?: unknown; comment?: unknown; lat?: unknown; lng?: unknown }>(req);
  if (!body || typeof body.shopId !== "string" || typeof body.address !== "string" || typeof body.phone !== "string") {
    return json({ error: "bad-address" }, 400);
  }
  const point = readPoint(body.lat, body.lng);
  const done = await placeOrder(
    user.id,
    {
      shopId: body.shopId,
      address: body.address,
      phone: body.phone,
      comment: typeof body.comment === "string" ? body.comment : "",
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    },
    langOf(user.lang),
  );
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ order: done.order });
}
