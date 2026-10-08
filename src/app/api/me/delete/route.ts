import { clearSessionCookie } from "@/server/auth";
import { getDb } from "@/server/db";
import { accountDeletions } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { wipeUser } from "@/server/jobs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<{ source?: string }>(req);
  if (!body || (body.source !== "app" && body.source !== "web")) return json({ error: "source" }, 400);
  const db = getDb();
  await db.insert(accountDeletions).values({ userId: user.id, source: body.source });
  await wipeUser(user.id);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
