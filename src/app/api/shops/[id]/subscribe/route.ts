import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { shops, subscriptions } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function countOf(shopId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.shopId, shopId));
  return Number(rows[0]?.n ?? 0);
}

async function payload(shopId: string, userId: string | null) {
  const count = await countOf(shopId);
  if (!userId) return { count, subscribed: false };
  const rows = await getDb()
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.shopId, shopId)))
    .limit(1);
  return { count, subscribed: Boolean(rows[0]) };
}

async function rememberCount(shopId: string, count: number) {
  try {
    await getDb().update(shops).set({ followersCount: count, updatedAt: new Date() }).where(eq(shops.id, shopId));
  } catch {
    /* followers_count is a cache for later lists; the subscription row is the source of truth */
  }
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser(req).catch(() => null);
  const db = getDb();
  const shop = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id)).limit(1);
  if (!shop[0]) return json({ error: "not-found" }, 404);
  return json(await payload(id, user?.id ?? null));
}

async function change(req: Request, ctx: Ctx, mode: "add" | "remove") {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db
    .select({ id: shops.id, ownerId: shops.ownerId, status: shops.status, underReview: shops.underReview })
    .from(shops)
    .where(eq(shops.id, id))
    .limit(1);
  const shop = rows[0];
  if (!shop) return json({ error: "not-found" }, 404);
  if (shop.underReview) return json({ error: "not-found" }, 404);
  if (shop.ownerId === user.id || shop.status === "hidden" || shop.status === "withdrawn") {
    return json({ error: "subscribe" }, 409);
  }
  if (shop.status !== "active") return json({ error: "not-found" }, 404);
  if (mode === "add") {
    await db.insert(subscriptions).values({ userId: user.id, shopId: id }).onConflictDoNothing();
  } else {
    await db.delete(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.shopId, id)));
  }
  const body = await payload(id, user.id);
  await rememberCount(id, body.count);
  return json(body);
}

export async function POST(req: Request, ctx: Ctx) {
  return change(req, ctx, "add");
}

export async function DELETE(req: Request, ctx: Ctx) {
  return change(req, ctx, "remove");
}
