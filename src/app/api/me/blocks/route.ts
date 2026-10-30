import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isDbUserId } from "@/lib/phone";
import { getDb } from "@/server/db";
import { blocks, users } from "@/server/db/schema";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function mine(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: blocks.blockedUserId })
    .from(blocks)
    .where(eq(blocks.blockerId, userId));
  return rows.map((row) => row.id);
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json({ blockedUserIds: await mine(user.id) });
}

type Body = { userId?: string };

async function targetOf(req: Request): Promise<{ userId: string } | NextResponse> {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson<Body>(req);
  const userId = body?.userId?.trim() ?? "";
  if (!isDbUserId(userId)) return json({ error: "user" }, 404);
  if (userId === user.id) return json({ error: "self" }, 400);
  return { userId };
}

export async function POST(req: Request) {
  const target = await targetOf(req);
  if (target instanceof NextResponse) return target;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const db = getDb();
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, target.userId), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(1);
  if (!found[0]) return json({ error: "user" }, 404);
  await db.insert(blocks).values({ blockerId: user.id, blockedUserId: target.userId }).onConflictDoNothing();
  return json({ blockedUserIds: await mine(user.id) });
}

export async function DELETE(req: Request) {
  const target = await targetOf(req);
  if (target instanceof NextResponse) return target;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  await getDb()
    .delete(blocks)
    .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedUserId, target.userId)));
  return json({ blockedUserIds: await mine(user.id) });
}
