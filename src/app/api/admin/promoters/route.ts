import { NextResponse } from "next/server";
import { sessionIsAdmin } from "@/server/auth";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { assignPromoterByEmail, listPromoters } from "@/server/masters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only: list of promoters (internal «master» flag). */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  return json({ promoters: await listPromoters() }, 200, { "Cache-Control": "no-store" });
}

/** Admin only: «Назначить промоутера» by account e-mail. */
export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const body = await readJson<{ email?: unknown }>(req);
  if (!body || typeof body.email !== "string") return json({ error: "bad-email" }, 400);
  const done = await assignPromoterByEmail(user.id, body.email);
  if ("error" in done) return json({ ok: false, error: done.error }, done.status);
  return json({ ok: true, id: done.id });
}
