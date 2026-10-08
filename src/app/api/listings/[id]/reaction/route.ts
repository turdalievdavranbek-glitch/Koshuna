import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { listings, reactions } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const body = await readJson<{ value?: "like" | "dislike" | null }>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const value = body.value ?? null;
  if (value !== null && value !== "like" && value !== "dislike") return json({ error: "bad-value" }, 400);
  const db = getDb();
  const found = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, id)).limit(1);
  if (!found[0]) return json({ error: "not-found" }, 404);

  const counts = await db.transaction(async (tx) => {
    const prev = await tx
      .select({ value: reactions.value })
      .from(reactions)
      .where(and(eq(reactions.userId, user.id), eq(reactions.listingId, id)))
      .limit(1);
    const old = prev[0]?.value ?? null;
    if (old === "like") await tx.update(listings).set({ likes: sql`GREATEST(${listings.likes} - 1, 0)` }).where(eq(listings.id, id));
    if (old === "dislike") {
      await tx.update(listings).set({ dislikes: sql`GREATEST(${listings.dislikes} - 1, 0)` }).where(eq(listings.id, id));
    }
    if (value == null) {
      await tx.delete(reactions).where(and(eq(reactions.userId, user.id), eq(reactions.listingId, id)));
    } else if (prev[0]) {
      await tx
        .update(reactions)
        .set({ value, updatedAt: new Date() })
        .where(and(eq(reactions.userId, user.id), eq(reactions.listingId, id)));
    } else {
      await tx.insert(reactions).values({ userId: user.id, listingId: id, value });
    }
    if (value === "like") await tx.update(listings).set({ likes: sql`${listings.likes} + 1` }).where(eq(listings.id, id));
    if (value === "dislike") await tx.update(listings).set({ dislikes: sql`${listings.dislikes} + 1` }).where(eq(listings.id, id));
    const [row] = await tx.select({ likes: listings.likes, dislikes: listings.dislikes }).from(listings).where(eq(listings.id, id));
    return row;
  });
  return json({ ok: true, likes: counts?.likes ?? 0, dislikes: counts?.dislikes ?? 0 });
}
