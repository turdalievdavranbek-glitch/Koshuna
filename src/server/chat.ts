import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { formatBuyQuantity } from "@/lib/buy-request";
import { holdPersonName } from "@/lib/public-name";
import { CHAT_REACTIONS, type ChatDetail, type ChatLine, type ChatThread } from "@/lib/chat";
import { getDb } from "./db";
import { blocks, listings, messageReactions, messages, purchaseRequests, shops, threads, users } from "./db/schema";
import { bindNoticePushes, saveNotice } from "./notices";
import { clearTyping, isTyping, markTyping, medianReplyMs } from "./presence";

const TEXT_MAX = 2000;
const OPEN = new Set(["active", "promoted", "reserved"]);

type Fail = { error: string; status: number };

/**
 * Text chat stored on the server. One thread per buyer and listing.
 * The seller's phone is never selected or returned. A new message is an in-app
 * notice and, when FCM is configured, a phone push to the other person.
 */
function photoOf(cover: string | null, photos: string[] | null): string | null {
  if (cover) return cover;
  const first = photos?.[0];
  return first || null;
}

async function pairBlocked(a: string, b: string): Promise<boolean> {
  const rows = await getDb()
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(and(eq(blocks.blockerId, a), eq(blocks.blockedUserId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedUserId, a))),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function openListingChat(buyerId: string, listingId: string): Promise<{ id: string } | Fail> {
  const db = getDb();
  const found = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      shopId: listings.shopId,
      status: listings.status,
      underReview: listings.underReview,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  const listing = found[0];
  if (!listing || listing.status === "hidden") return { error: "not-found", status: 404 };
  if (listing.ownerId === buyerId) return { error: "own", status: 403 };

  const existing = await db
    .select({ id: threads.id, sellerId: threads.sellerId })
    .from(threads)
    .where(and(eq(threads.listingId, listingId), eq(threads.buyerId, buyerId)))
    .limit(1);
  const sellerId = existing[0]?.sellerId ?? listing.ownerId;
  const blocked = await pairBlocked(buyerId, sellerId);
  if (blocked && !existing[0]) return { error: "blocked", status: 403 };
  if (existing[0]) return { id: existing[0].id };
  if (listing.underReview) return { error: "not-found", status: 404 };
  if (listing.shopId) {
    const shop = await db
      .select({ underReview: shops.underReview })
      .from(shops)
      .where(eq(shops.id, listing.shopId))
      .limit(1);
    if (shop[0]?.underReview) return { error: "not-found", status: 404 };
  }
  if (!OPEN.has(listing.status)) return { error: "closed", status: 409 };

  const seller = await db
    .select({ id: users.id, deletedAt: users.deletedAt, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, listing.ownerId))
    .limit(1);
  if (!seller[0] || seller[0].deletedAt || seller[0].bannedAt) return { error: "closed", status: 409 };

  const now = new Date();
  const inserted = await db
    .insert(threads)
    .values({
      listingId,
      shopId: listing.shopId,
      buyerId,
      sellerId: listing.ownerId,
      lastMessageAt: now,
    })
    .onConflictDoNothing({ target: [threads.listingId, threads.buyerId] })
    .returning({ id: threads.id });
  if (inserted[0]) return { id: inserted[0].id };
  const again = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.listingId, listingId), eq(threads.buyerId, buyerId)))
    .limit(1);
  if (!again[0]) return { error: "save", status: 500 };
  return { id: again[0].id };
}

/** One thread per point and purchase request. The buyer's phone is never read. */
export async function openRequestThread(
  sellerId: string,
  row: { requestId: string; shopId: string; buyerId: string },
): Promise<{ id: string } | Fail> {
  if (sellerId === row.buyerId) return { error: "own", status: 403 };
  const blocked = await pairBlocked(sellerId, row.buyerId);
  if (blocked) return { error: "blocked", status: 403 };
  const db = getDb();
  const existing = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.requestId, row.requestId), eq(threads.shopId, row.shopId)))
    .limit(1);
  if (existing[0]) return { id: existing[0].id };
  try {
    const inserted = await db
      .insert(threads)
      .values({
        listingId: null,
        shopId: row.shopId,
        buyerId: row.buyerId,
        sellerId,
        requestId: row.requestId,
        lastMessageAt: new Date(),
      })
      .returning({ id: threads.id });
    if (inserted[0]) return { id: inserted[0].id };
  } catch {
    const again = await db
      .select({ id: threads.id })
      .from(threads)
      .where(and(eq(threads.requestId, row.requestId), eq(threads.shopId, row.shopId)))
      .limit(1);
    if (again[0]) return { id: again[0].id };
  }
  return { error: "save", status: 500 };
}

export async function listChats(userId: string): Promise<{ threads: ChatThread[]; unread: number }> {
  const db = getDb();
  const rows = await db
    .select({
      id: threads.id,
      listingId: threads.listingId,
      requestId: threads.requestId,
      buyerId: threads.buyerId,
      sellerId: threads.sellerId,
      lastMessageAt: threads.lastMessageAt,
      createdAt: threads.createdAt,
      unread: sql<number>`(
        select count(*)::int from messages
        where messages.thread_id = threads.id
          and messages.sender_id <> ${userId}::uuid
          and messages.read_at is null
          and messages.created_at > coalesce(case when threads.buyer_id = ${userId}::uuid then threads.buyer_cleared_at else threads.seller_cleared_at end, '-infinity'::timestamptz)
      )`,
      preview: sql<string | null>`(
        select messages.text from messages
        where messages.thread_id = threads.id
          and messages.kind = 'text'
          and messages.deleted_at is null
          and messages.created_at > coalesce(case when threads.buyer_id = ${userId}::uuid then threads.buyer_cleared_at else threads.seller_cleared_at end, '-infinity'::timestamptz)
        order by messages.created_at desc
        limit 1
      )`,
    })
    .from(threads)
    .where(
      and(
        or(eq(threads.buyerId, userId), eq(threads.sellerId, userId)),
        // Hidden after «Удалить переписку» until a newer message arrives.
        sql`coalesce(${threads.lastMessageAt}, ${threads.createdAt}) > coalesce(case when threads.buyer_id = ${userId}::uuid then threads.buyer_cleared_at else threads.seller_cleared_at end, '-infinity'::timestamptz)`,
      ),
    )
    .orderBy(sql`coalesce(${threads.lastMessageAt}, ${threads.createdAt}) desc`)
    .limit(50);
  if (!rows.length) return { threads: [], unread: 0 };

  const listingIds = [...new Set(rows.map((row) => row.listingId).filter((id): id is string => Boolean(id)))];
  const requestIds = [...new Set(rows.map((row) => row.requestId).filter((id): id is string => Boolean(id)))];
  const personIds = [...new Set(rows.flatMap((row) => [row.buyerId, row.sellerId]))];
  const [people, cards, asks] = await Promise.all([
    db.select({ id: users.id, name: users.name, lastSeenAt: users.lastSeenAt }).from(users).where(inArray(users.id, personIds)),
    listingIds.length
      ? db
          .select({
            id: listings.id,
            title: listings.title,
            coverUrl: listings.coverUrl,
            photos: listings.photos,
          })
          .from(listings)
          .where(inArray(listings.id, listingIds))
      : Promise.resolve([]),
    requestIds.length
      ? db
          .select({
            id: purchaseRequests.id,
            text: purchaseRequests.text,
            quantity: purchaseRequests.quantity,
            unit: purchaseRequests.unit,
          })
          .from(purchaseRequests)
          .where(inArray(purchaseRequests.id, requestIds))
      : Promise.resolve([]),
  ]);
  const names = new Map(people.map((row) => [row.id, holdPersonName(row.name)]));
  const seenAt = new Map(people.map((row) => [row.id, row.lastSeenAt?.getTime() ?? 0]));
  const cardsById = new Map(cards.map((row) => [row.id, row]));
  const askById = new Map(asks.map((row) => [row.id, row]));
  let unread = 0;
  const list: ChatThread[] = rows.map((row) => {
    const n = Number(row.unread) || 0;
    unread += n;
    const card = row.listingId ? cardsById.get(row.listingId) : undefined;
    const ask = row.requestId ? askById.get(row.requestId) : undefined;
    const request = card ? undefined : ask;
    const peerId = row.buyerId === userId ? row.sellerId : row.buyerId;
    return {
      id: row.id,
      listingId: row.listingId,
      title: card?.title || ask?.text || "",
      requestQuantity: request ? formatBuyQuantity(request.quantity) : null,
      requestUnit: request ? request.unit ?? null : null,
      photo: card ? photoOf(card.coverUrl, card.photos) : null,
      peerId,
      peerName: names.get(peerId) ?? "",
      peerOnline: Date.now() - (seenAt.get(peerId) ?? 0) < 2 * 60_000,
      role: row.sellerId === userId ? "sell" : "buy",
      preview: (row.preview ?? "").trim(),
      lastMessageAt: (row.lastMessageAt ?? row.createdAt).toISOString(),
      unread: n,
    };
  });
  return { threads: list, unread };
}

async function loadParticipant(userId: string, threadId: string) {
  const rows = await getDb().select().from(threads).where(eq(threads.id, threadId)).limit(1);
  const thread = rows[0];
  if (!thread || (thread.buyerId !== userId && thread.sellerId !== userId)) return null;
  return thread;
}

export async function readChat(userId: string, threadId: string): Promise<ChatDetail | Fail> {
  const db = getDb();
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  const peerId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
  const clearedAt = thread.buyerId === userId ? thread.buyerClearedAt : thread.sellerClearedAt;
  const [lines, person, card, ask, blocked] = await Promise.all([
    db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        kind: messages.kind,
        text: messages.text,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(
        clearedAt
          ? and(eq(messages.threadId, thread.id), gt(messages.createdAt, clearedAt))
          : eq(messages.threadId, thread.id),
      )
      .orderBy(desc(messages.createdAt))
      .limit(200),
    db.select({ name: users.name, lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, peerId)).limit(1),
    thread.listingId
      ? db
          .select({ title: listings.title, coverUrl: listings.coverUrl, photos: listings.photos, section: listings.section })
          .from(listings)
          .where(eq(listings.id, thread.listingId))
          .limit(1)
      : Promise.resolve([]),
    thread.requestId
      ? db
          .select({ text: purchaseRequests.text, quantity: purchaseRequests.quantity, unit: purchaseRequests.unit })
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, thread.requestId))
          .limit(1)
      : Promise.resolve([]),
    pairBlocked(userId, peerId),
  ]);
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.threadId, thread.id), ne(messages.senderId, userId), isNull(messages.readAt)));
  const shown: ChatLine[] = lines
    .reverse()
    .filter((row) => row.kind === "text" && (row.deletedAt || (row.text ?? "").trim()))
    .map((row) => ({
      id: row.id,
      mine: row.senderId === userId,
      // A deleted message keeps its place but never its text.
      text: row.deletedAt ? "" : (row.text ?? "").trim(),
      createdAt: row.createdAt.toISOString(),
      editedAt: row.deletedAt ? null : (row.editedAt?.toISOString() ?? null),
      deleted: Boolean(row.deletedAt),
    }));
  if (shown.length) {
    const rows = await db
      .select({ messageId: messageReactions.messageId, userId: messageReactions.userId, emoji: messageReactions.emoji })
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, shown.map((row) => row.id)));
    const byId = new Map(shown.map((row) => [row.id, row]));
    for (const row of rows) {
      const line = byId.get(row.messageId);
      if (!line || line.deleted) continue;
      if (row.userId === userId) line.myReaction = row.emoji;
      else line.peerReaction = row.emoji;
    }
  }
  const listing = card[0];
  const request = listing ? undefined : ask[0];
  return {
    id: thread.id,
    listingId: thread.listingId,
    title: listing?.title || request?.text || "",
    requestQuantity: request ? formatBuyQuantity(request.quantity) : null,
    requestUnit: request?.unit ?? null,
    photo: listing ? photoOf(listing.coverUrl, listing.photos) : null,
    peerId,
    peerName: holdPersonName(person[0]?.name),
    blocked,
    section: listing?.section ?? null,
    messages: shown,
    peerLastSeenAt: person[0]?.lastSeenAt?.toISOString() ?? null,
    peerTyping: isTyping(thread.id, peerId),
    peerReplyMs: await medianReplyMs(peerId).catch(() => null),
  };
}

/** «Удалить переписку» for this user only: the other participant keeps the whole chat. */
export async function clearChatForUser(userId: string, threadId: string): Promise<{ ok: true } | Fail> {
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  const now = new Date();
  await getDb()
    .update(threads)
    .set(thread.buyerId === userId ? { buyerClearedAt: now } : { sellerClearedAt: now })
    .where(eq(threads.id, thread.id));
  return { ok: true };
}

/** «печатает…» signal from a participant (in memory, ~6 s). */
export async function touchTyping(userId: string, threadId: string): Promise<{ ok: true } | Fail> {
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  markTyping(thread.id, userId);
  return { ok: true };
}

export async function sendChat(userId: string, threadId: string, raw: string): Promise<{ message: ChatLine } | Fail> {
  const text = raw.trim();
  if (!text || text.length > TEXT_MAX) return { error: "text", status: 400 };
  const db = getDb();
  return bindNoticePushes(() => db.transaction(async (tx) => {
    const locked = await tx.select().from(threads).where(eq(threads.id, threadId)).limit(1);
    const thread = locked[0];
    if (!thread || (thread.buyerId !== userId && thread.sellerId !== userId)) return { error: "not-found", status: 404 };
    const peerId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
    const blocked = await tx
      .select({ blockerId: blocks.blockerId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, userId), eq(blocks.blockedUserId, peerId)),
          and(eq(blocks.blockerId, peerId), eq(blocks.blockedUserId, userId)),
        ),
      )
      .limit(1);
    if (blocked[0]) return { error: "blocked", status: 403 };

    clearTyping(thread.id, userId);
    const now = new Date();
    const inserted = await tx
      .insert(messages)
      .values({ threadId: thread.id, senderId: userId, kind: "text", text, createdAt: now })
      .returning({ id: messages.id, createdAt: messages.createdAt });
    const row = inserted[0];
    if (!row) return { error: "save", status: 500 };
    await tx.update(threads).set({ lastMessageAt: now }).where(eq(threads.id, thread.id));

    const [sender, card, ask] = await Promise.all([
      tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1),
      thread.listingId
        ? tx.select({ title: listings.title }).from(listings).where(eq(listings.id, thread.listingId)).limit(1)
        : Promise.resolve([]),
      thread.requestId
        ? tx
            .select({ text: purchaseRequests.text, quantity: purchaseRequests.quantity, unit: purchaseRequests.unit })
            .from(purchaseRequests)
            .where(eq(purchaseRequests.id, thread.requestId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    await saveNotice(tx, {
      userId: peerId,
      type: "chat_message",
      listingId: thread.listingId,
      textKey: "notifChat",
      params: {
        name: holdPersonName(sender[0]?.name),
        title: (card[0]?.title || ask[0]?.text || "").slice(0, 120),
        threadId: thread.id,
      },
      actorId: userId,
      chat: { preview: text },
    });
    return {
      message: {
        id: row.id,
        mine: true,
        text,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }));
}

/** Only the sender, any time. No notice and no push; unread counters stay as they are. */
export async function editChatMessage(
  userId: string,
  threadId: string,
  messageId: string,
  raw: string,
): Promise<{ message: ChatLine } | Fail> {
  const text = raw.trim();
  if (!text || text.length > TEXT_MAX) return { error: "text", status: 400 };
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  const rows = await getDb()
    .update(messages)
    .set({ text, editedAt: new Date() })
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.threadId, thread.id),
        eq(messages.senderId, userId),
        eq(messages.kind, "text"),
        isNull(messages.deletedAt),
      ),
    )
    .returning({ id: messages.id, text: messages.text, createdAt: messages.createdAt, editedAt: messages.editedAt });
  const row = rows[0];
  if (!row) return { error: "forbidden", status: 403 };
  return {
    message: {
      id: row.id,
      mine: true,
      text: (row.text ?? "").trim(),
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      deleted: false,
    },
  };
}

/** Soft delete for both people. Only the sender. */
export async function deleteChatMessage(userId: string, threadId: string, messageId: string): Promise<{ message: ChatLine } | Fail> {
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  const rows = await getDb()
    .update(messages)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.threadId, thread.id),
        eq(messages.senderId, userId),
        eq(messages.kind, "text"),
        isNull(messages.deletedAt),
      ),
    )
    .returning({ id: messages.id, createdAt: messages.createdAt });
  const row = rows[0];
  if (!row) return { error: "forbidden", status: 403 };
  return { message: { id: row.id, mine: true, text: "", createdAt: row.createdAt.toISOString(), editedAt: null, deleted: true } };
}

/** Either participant reacts to a message in the thread. Same emoji again (or null) removes it. */
export async function setMessageReaction(
  userId: string,
  threadId: string,
  messageId: string,
  emoji: string | null,
): Promise<{ messageId: string; myReaction: string | null } | Fail> {
  if (emoji !== null && !(CHAT_REACTIONS as readonly string[]).includes(emoji)) return { error: "bad-emoji", status: 400 };
  const db = getDb();
  const thread = await loadParticipant(userId, threadId);
  if (!thread) return { error: "not-found", status: 404 };
  const found = await db
    .select({ id: messages.id, deletedAt: messages.deletedAt })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.threadId, thread.id)))
    .limit(1);
  if (!found[0] || found[0].deletedAt) return { error: "not-found", status: 404 };
  const peerId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
  if (await pairBlocked(userId, peerId)) return { error: "blocked", status: 403 };
  const prev = await db
    .select({ emoji: messageReactions.emoji })
    .from(messageReactions)
    .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)))
    .limit(1);
  const next = emoji === null || prev[0]?.emoji === emoji ? null : emoji;
  if (next === null) {
    await db.delete(messageReactions).where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)));
  } else {
    await db
      .insert(messageReactions)
      .values({ messageId, userId, emoji: next })
      .onConflictDoUpdate({ target: [messageReactions.messageId, messageReactions.userId], set: { emoji: next, createdAt: new Date() } });
  }
  return { messageId, myReaction: next };
}
