import { AsyncLocalStorage } from "node:async_hooks";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { isDbUserId } from "@/lib/phone";
import { getDb, type Db } from "./db";
import * as schema from "./db/schema";

const { notifications } = schema;
import { deliverPush, type NoticePush } from "./push";

type Tx = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
type NoticeDb = Db | Tx;

export type NoticeWrite = {
  userId: string;
  type: string;
  listingId?: string | null;
  textKey: string;
  params?: { name?: string; title?: string; threadId?: string; requestId?: string };
  /** The other person. Push is skipped when either side has blocked the other. */
  actorId?: string | null;
  /** Chat only: message preview, or a photo/video label chosen from the recipient's language. */
  chat?: { preview?: string; media?: "photo" | "video" };
};

const pendingPushes = new AsyncLocalStorage<NoticePush[]>();

/**
 * Runs `fn` (usually a DB transaction). Pushes are sent only after `fn` resolves,
 * so a rolled-back notice is not delivered.
 */
export async function bindNoticePushes<T>(fn: () => Promise<T>): Promise<T> {
  const jobs: NoticePush[] = [];
  const result = await pendingPushes.run(jobs, fn);
  for (const job of jobs) {
    void deliverPush(job).catch((err) => {
      console.error("push", err instanceof Error ? err.message : "failed");
    });
  }
  return result;
}

function queuePush(job: NoticePush): void {
  const bucket = pendingPushes.getStore();
  if (bucket) {
    bucket.push(job);
    return;
  }
  void deliverPush(job).catch((err) => {
    console.error("push", err instanceof Error ? err.message : "failed");
  });
}

/** Inserts in-app notices and queues a phone push for each. Every notice goes through here. */
export async function saveNotices(db: NoticeDb, inputs: NoticeWrite[]): Promise<void> {
  if (!inputs.length) return;
  const inserted = await db
    .insert(notifications)
    .values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        listingId: input.listingId ?? null,
        textKey: input.textKey,
        params: input.params ?? {},
      })),
    )
    .returning({ id: notifications.id });
  inserted.forEach((row, index) => {
    const input = inputs[index];
    if (!row?.id || !input) return;
    queuePush({
      noticeId: row.id,
      userId: input.userId,
      type: input.type,
      textKey: input.textKey,
      listingId: input.listingId,
      threadId: input.params?.threadId,
      requestId: input.params?.requestId,
      actorId: input.actorId,
      name: input.params?.name,
      title: input.params?.title,
      chat: input.chat,
    });
  });
}

export async function saveNotice(db: NoticeDb, input: NoticeWrite): Promise<void> {
  await saveNotices(db, [input]);
}

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
