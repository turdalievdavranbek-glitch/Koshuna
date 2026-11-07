import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const days = Number(process.env.LISTING_TTL_DAYS || 30);
  const n = Number.isFinite(days) && days > 0 ? days : 30;
  const now = new Date();
  const updated = await getDb()
    .update(listings)
    .set({
      lastConfirmedAt: now,
      expiresAt: new Date(now.getTime() + n * 86_400_000),
      reminderSentAt: null,
      updatedAt: now,
    })
    .where(and(eq(listings.id, id), eq(listings.ownerId, user.id)))
    .returning({ id: listings.id });
  if (!updated[0]) return json({ error: "forbidden" }, 403);
  return json({ ok: true });
}
