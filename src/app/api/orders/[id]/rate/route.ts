import { NextResponse } from "next/server";
import { rateDelivery } from "@/server/delivery-standing";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<{ courierStars?: unknown; shopStars?: unknown }>(req);
  const courierStars = Number(body?.courierStars);
  const shopStars = Number(body?.shopStars);
  const done = await rateDelivery(user.id, id, courierStars, shopStars);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
