import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cartItems, listings } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ listingId: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { listingId } = await ctx.params;
  const db = getDb();
  const found = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!found[0]) return json({ error: "not-found" }, 404);
  await db.insert(cartItems).values({ userId: user.id, listingId }).onConflictDoNothing();
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { listingId } = await ctx.params;
  await getDb().delete(cartItems).where(and(eq(cartItems.userId, user.id), eq(cartItems.listingId, listingId)));
  return json({ ok: true });
}
