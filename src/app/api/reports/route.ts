import { and, eq } from "drizzle-orm";
import { maybeHideForReview } from "@/server/moderation";
import { getDb } from "@/server/db";
import { listingComments, listings, reports, shops } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { listingId?: string; shopId?: string; targetUserId?: string; commentId?: string; reason?: string; comment?: string };

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  if (!body || typeof body.reason !== "string" || !body.reason.trim()) return json({ error: "reason" }, 400);
  const listingId = body.listingId || null;
  const shopId = body.shopId || null;
  const targetUserId = body.targetUserId || null;
  const commentId = body.commentId || null;
  const targets = [listingId, shopId, targetUserId, commentId].filter(Boolean);
  if (targets.length !== 1) return json({ error: "target" }, 400);

  const db = getDb();
  if (listingId) {
    const rows = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!rows[0]) return json({ error: "not-found" }, 404);
    if (rows[0].ownerId === user.id) return json({ error: "own" }, 400);
  }
  if (shopId) {
    const rows = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, shopId)).limit(1);
    if (!rows[0]) return json({ error: "not-found" }, 404);
    if (rows[0].ownerId === user.id) return json({ error: "own" }, 400);
  }
  if (targetUserId && targetUserId === user.id) return json({ error: "own" }, 400);
  if (commentId) {
    if (!/^[0-9a-f-]{36}$/i.test(commentId)) return json({ error: "not-found" }, 404);
    const rows = await db
      .select({ authorId: listingComments.authorId, deletedAt: listingComments.deletedAt })
      .from(listingComments)
      .where(eq(listingComments.id, commentId))
      .limit(1);
    if (!rows[0] || rows[0].deletedAt) return json({ error: "not-found" }, 404);
    if (rows[0].authorId === user.id) return json({ error: "own" }, 400);
  }

  const reason = body.reason.trim().slice(0, 200);
  const comment = body.comment?.trim().slice(0, 2000) || null;
  const existing = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, user.id),
        eq(reports.status, "new"),
        listingId
          ? eq(reports.listingId, listingId)
          : shopId
            ? eq(reports.shopId, shopId)
            : commentId
              ? eq(reports.commentId, commentId)
              : eq(reports.targetUserId, targetUserId ?? ""),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db.update(reports).set({ reason, comment }).where(eq(reports.id, existing[0].id));
    await maybeHideForReview({ listingId, shopId, commentId });
    return json({ ok: true, id: existing[0].id }, 200);
  }

  const [row] = await db
    .insert(reports)
    .values({
      reporterId: user.id,
      listingId,
      shopId,
      targetUserId,
      commentId,
      reason,
      comment,
    })
    .returning({ id: reports.id });
  await maybeHideForReview({ listingId, shopId, commentId });
  return json({ ok: true, id: row.id }, 201);
}
