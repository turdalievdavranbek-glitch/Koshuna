import { NextResponse } from "next/server";
import { sessionIsAdmin } from "@/server/auth";
import { listStuckOrders, resolveStuck } from "@/server/delivery-sweep";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  return json({ orders: await listStuckOrders() }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const body = await readJson<{ id?: unknown; action?: unknown }>(req);
  if (!body || typeof body.id !== "string" || (body.action !== "unlock" && body.action !== "clear")) return json({ error: "bad-action" }, 400);
  const done = await resolveStuck(body.id, body.action);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
