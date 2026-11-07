import { NextResponse } from "next/server";
import { setCourierPlace } from "@/server/couriers";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Courier changes the working city and district. No new review. */
export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ city?: unknown; district?: unknown }>(req);
  if (!body || typeof body.city !== "string") return json({ error: "bad-city" }, 400);
  const district = typeof body.district === "string" ? body.district : "";
  const done = await setCourierPlace(user.id, body.city, district);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true, city: done.city, district: done.district });
}
