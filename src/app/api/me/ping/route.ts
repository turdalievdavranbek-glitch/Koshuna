import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Presence heartbeat: requireUser touches users.last_seen_at (at most once a minute). */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json({ ok: true }, 200, { "Cache-Control": "no-store" });
}
