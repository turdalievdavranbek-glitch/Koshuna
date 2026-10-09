import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { isDbUserId } from "@/lib/phone";
import { getDb } from "./db";
import { notifications } from "./db/schema";

type NoticeParams = { name?: string; title?: string; threadId?: string; requestId?: string };

function readParams(value: unknown): NoticeParams {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const threadId = typeof row.threadId === "string" && isDbUserId(row.threadId) ? row.threadId : undefined;
  const requestId = typeof row.requestId === "string" && isDbUserId(row.requestId) ? row.requestId : undefined;
  return {
    name: typeof row.name === "string" ? row.name : undefined,
    title: typeof row.title === "string" ? row.title : undefined,
    threadId,
    requestId,
  };
}

export async function listNotices(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unreadRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return {
    notices: rows.map((row) => ({
      id: row.id,
      type: row.type,
      listingId: row.listingId,
      textKey: row.textKey,
      params: readParams(row.params),
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
    })),
    unread: Number(unreadRows[0]?.n ?? 0),
  };
}

export async function markNoticesRead(userId: string) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
