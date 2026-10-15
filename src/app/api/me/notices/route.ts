import { guardCsrf, json, requireUser } from "@/server/http";
import { listNotices, markNoticesRead } from "@/server/notices";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json(await listNotices(user.id));
}

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  await markNoticesRead(user.id);
  return json({ ok: true });
}
