import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isDbUserId } from "@/lib/phone";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { userFollows, users } from "@/server/db/schema";
import { guardCsrf, json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function liveUser(id: string) {
  if (!isDbUserId(id)) return null;
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(1);
  return rows[0] ?? null;
}

async function countOf(followeeId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(userFollows)
    .where(eq(userFollows.followeeId, followeeId));
  return Number(rows[0]?.n ?? 0);
}

async function payload(followeeId: string, userId: string | null) {
  const count = await countOf(followeeId);
  if (!userId || userId === followeeId) return { count, following: false };
  const rows = await getDb()
    .select({ followerId: userFollows.followerId })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, userId), eq(userFollows.followeeId, followeeId)))
    .limit(1);
  return { count, following: Boolean(rows[0]) };
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const person = await liveUser(id);
  if (!person) return json({ error: "not-found" }, 404);
  const user = await getSessionUser(req).catch(() => null);
  return json(await payload(id, user?.id ?? null));
}

async function change(req: Request, ctx: Ctx, mode: "add" | "remove") {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const person = await liveUser(id);
  if (!person) return json({ error: "not-found" }, 404);
  if (id === user.id) return json({ error: "self" }, 409);
  const db = getDb();
  if (mode === "add") {
    await db.insert(userFollows).values({ followerId: user.id, followeeId: id }).onConflictDoNothing();
  } else {
    await db.delete(userFollows).where(and(eq(userFollows.followerId, user.id), eq(userFollows.followeeId, id)));
  }
  return json(await payload(id, user.id));
}

export async function POST(req: Request, ctx: Ctx) {
  return change(req, ctx, "add");
}

export async function DELETE(req: Request, ctx: Ctx) {
  return change(req, ctx, "remove");
}
