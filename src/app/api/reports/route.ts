import { getDb } from "@/server/db";
import { reports } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { listingId?: string; shopId?: string; targetUserId?: string; reason?: string; comment?: string };

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  if (!body || typeof body.reason !== "string" || !body.reason.trim()) return json({ error: "reason" }, 400);
  const targets = [body.listingId, body.shopId, body.targetUserId].filter(Boolean);
  if (targets.length !== 1) return json({ error: "target" }, 400);
  const [row] = await getDb()
    .insert(reports)
    .values({
      reporterId: user.id,
      listingId: body.listingId || null,
      shopId: body.shopId || null,
      targetUserId: body.targetUserId || null,
      reason: body.reason.trim().slice(0, 200),
      comment: body.comment?.trim().slice(0, 2000) || null,
    })
    .returning({ id: reports.id });
  return json({ ok: true, id: row.id }, 201);
}
