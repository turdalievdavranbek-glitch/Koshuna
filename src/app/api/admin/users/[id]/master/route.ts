import { NextResponse } from "next/server";
import { isDbUserId } from "@/lib/phone";
import { sessionIsAdmin } from "@/server/auth";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { setMaster } from "@/server/masters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Admin only: turn «Мастер-аккаунт» on or off. Role is checked here, not in the UI. */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "not-found" }, 404);
  const body = await readJson<{ on?: unknown }>(req);
  if (!body || typeof body.on !== "boolean") return json({ error: "bad-json" }, 400);
  const done = await setMaster(user.id, id, body.on);
  if ("error" in done) return json({ ok: false, error: done.error }, done.status);
  return json({ ok: true, on: body.on });
}
