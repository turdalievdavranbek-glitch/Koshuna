import { NextResponse } from "next/server";
import { sessionIsAdmin } from "@/server/auth";
import { unblockBuyer } from "@/server/couriers";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const { id } = await ctx.params;
  const done = await unblockBuyer(user.id, id);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
