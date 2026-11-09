import { NextResponse } from "next/server";
import { isDbUserId } from "@/lib/phone";
import { readOrderTrack, saveOrderTrack } from "@/server/delivery-track";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "not-found" }, 404);
  const track = await readOrderTrack(user.id, id);
  if ("error" in track) return json({ error: track.error }, track.status);
  return json(track, 200, { "Cache-Control": "no-store" });
}

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!isDbUserId(id)) return json({ error: "not-found" }, 404);
  const body = await readJson<{ lat?: unknown; lng?: unknown }>(req);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const done = await saveOrderTrack(user.id, id, lat, lng);
  if ("error" in done) return json({ error: done.error }, done.status);
  return json({ ok: true });
}
