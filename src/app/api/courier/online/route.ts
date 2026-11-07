import { NextResponse } from "next/server";
import { setCourierOnline } from "@/server/couriers";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ on?: unknown }>(req);
  if (!body || typeof body.on !== "boolean") return json({ error: "bad-action" }, 400);
  const done = await setCourierOnline(user.id, body.on);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true, online: done.online });
}
