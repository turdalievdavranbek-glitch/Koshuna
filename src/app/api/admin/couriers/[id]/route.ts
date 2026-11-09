import { NextResponse } from "next/server";
import { canReviewCouriers, reviewCourier } from "@/server/couriers";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await canReviewCouriers(user.id))) return json({ error: "forbidden" }, 403);
  const body = await readJson<{ action?: unknown; reason?: unknown }>(req);
  if (!body || (body.action !== "approve" && body.action !== "revoke")) return json({ error: "bad-action" }, 400);
  const { id } = await ctx.params;
  const done = await reviewCourier(user.id, id, body.action === "approve", typeof body.reason === "string" ? body.reason : "");
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
