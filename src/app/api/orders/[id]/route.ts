import { NextResponse } from "next/server";
import type { Lang } from "@/lib/types";
import { actOnOrder, getOrder } from "@/server/delivery";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function langOf(value: string): Lang {
  return value === "ky" ? "ky" : "ru";
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const order = await getOrder(user.id, id, langOf(user.lang));
  if ("error" in order) return json({ error: order.error }, order.status);
  return json({ order }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<{ action?: unknown; code?: unknown; reason?: unknown }>(req);
  if (!body || typeof body.action !== "string") return json({ error: "bad-action" }, 400);
  const done = await actOnOrder(
    user.id,
    id,
    body.action,
    {
      code: typeof body.code === "string" ? body.code : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    },
    langOf(user.lang),
  );
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ order: done.order });
}
