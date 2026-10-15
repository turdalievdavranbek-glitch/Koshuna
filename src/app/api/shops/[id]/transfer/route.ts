import { NextResponse } from "next/server";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { findTransferTarget, ownsShop, targetLabel, transferShop } from "@/server/shop-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Body = { target?: string; confirm?: boolean };

/**
 * «Передать точку». Step 1 (no confirm): find the receiver, answer with a masked label to show.
 * Step 2 (confirm: true): move the point and all its items. Ownership is checked on the server.
 */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const owns = await ownsShop(user.id, id);
  if (owns === "missing") return json({ error: "not-found" }, 404);
  if (owns === "no") return json({ error: "forbidden" }, 403);
  const body = await readJson<Body>(req);
  if (!body || typeof body.target !== "string") return json({ error: "bad-json" }, 400);
  const target = await findTransferTarget(body.target);
  if (!target) return json({ error: "no-user" }, 404);
  if (target.id === user.id) return json({ error: "self" }, 400);
  if (body.confirm !== true) return json({ ok: true, label: targetLabel(target) });
  const done = await transferShop(user.id, user.name || "", id, target);
  if ("error" in done) return json({ ok: false, error: done.error }, done.status);
  return json({ ok: true, label: targetLabel(target) });
}
