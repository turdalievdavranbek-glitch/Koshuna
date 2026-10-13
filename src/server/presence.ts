import { sql } from "drizzle-orm";
import { getDb } from "./db";

/** «печатает…»: in-memory, single pm2 process. threadId -> userId -> until (ms). */
const typing = new Map<string, Map<string, number>>();
const TYPING_MS = 6000;

export function markTyping(threadId: string, userId: string, now = Date.now()): void {
  let row = typing.get(threadId);
  if (!row) {
    row = new Map();
    typing.set(threadId, row);
  }
  row.set(userId, now + TYPING_MS);
  if (typing.size > 5000) {
    for (const [id, users] of typing) {
      for (const [uid, until] of users) if (until < now) users.delete(uid);
      if (!users.size) typing.delete(id);
    }
  }
}

export function clearTyping(threadId: string, userId: string): void {
  typing.get(threadId)?.delete(userId);
}

export function isTyping(threadId: string, userId: string, now = Date.now()): boolean {
  return (typing.get(threadId)?.get(userId) ?? 0) > now;
}

/** Median reply time (ms) of a user over 30 days, cached 30 min. null = too little data. */
const replyCache = new Map<string, { at: number; value: number | null }>();
const REPLY_TTL = 30 * 60_000;
const REPLY_MIN_SAMPLES = 3;

export async function medianReplyMs(userId: string): Promise<number | null> {
  const hit = replyCache.get(userId);
  if (hit && Date.now() - hit.at < REPLY_TTL) return hit.value;
  const res = await getDb().execute(sql`
    select percentile_cont(0.5) within group (order by d) as median, count(*)::int as n
    from (
      select extract(epoch from (m.created_at - lag(m.created_at) over w)) * 1000 as d,
             m.sender_id, lag(m.sender_id) over w as prev_sender
      from messages m
      where m.created_at > now() - interval '30 days'
        and m.kind = 'text'
        and m.thread_id in (select t.id from threads t where t.buyer_id = ${userId} or t.seller_id = ${userId})
      window w as (partition by m.thread_id order by m.created_at)
    ) x
    where x.sender_id = ${userId} and x.prev_sender is not null and x.prev_sender <> ${userId}
  `);
  const row = (res as unknown as { rows?: Array<{ median: number | string | null; n: number }> }).rows?.[0]
    ?? (res as unknown as Array<{ median: number | string | null; n: number }>)[0];
  const n = Number(row?.n ?? 0);
  const value = n >= REPLY_MIN_SAMPLES && row?.median != null ? Number(row.median) : null;
  replyCache.set(userId, { at: Date.now(), value });
  if (replyCache.size > 5000) replyCache.clear();
  return value;
}
