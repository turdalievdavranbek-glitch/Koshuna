import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { formatBuyQuantity } from "@/lib/buy-request";
import { holdPersonName } from "@/lib/public-name";
import { CHAT_REACTIONS, type ChatDetail, type ChatLine, type ChatThread } from "@/lib/chat";
import { getDb } from "./db";
import { blocks, listings, messageReactions, messages, purchaseRequests, shops, threads, users } from "./db/schema";
import { bindNoticePushes, saveNotice } from "./notices";
import { mediaUrlError } from "./mappers";
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
        select case when messages.kind = 'text' then messages.text else '' end from messages
        where messages.thread_id = threads.id
          and messages.deleted_at is null
          and messages.created_at > coalesce(case when threads.buyer_id = ${userId}::uuid then threads.buyer_cleared_at else threads.seller_cleared_at end, '-infinity'::timestamptz)
        order by messages.created_at desc
        limit 1
      )`,
      previewKind: sql<string | null>`(
        select messages.kind from messages
        where messages.thread_id = threads.id
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
      previewKind: row.previewKind === "voice" || row.previewKind === "photo" || row.previewKind === "system" || row.previewKind === "text" ? row.previewKind : null,
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
        mediaUrl: messages.mediaUrl,
        voiceSec: messages.voiceSec,
        photos: messages.photos,
        replyToId: messages.replyToId,
        readAt: messages.readAt,
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
  const firstUnreadId =
    [...lines].reverse().find((row) => row.senderId !== userId && !row.readAt && !row.deletedAt)?.id ?? null;
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.threadId, thread.id), ne(messages.senderId, userId), isNull(messages.readAt)));
  const shown: Array<ChatLine & { replyToId?: string | null }> = lines
    .reverse()
    .filter((row) => row.deletedAt || (row.kind === "text" && (row.text ?? "").trim()) || (row.kind === "voice" && row.mediaUrl) || (row.kind === "photo" && (row.photos?.length || row.mediaUrl)))
    .map((row) => ({
      id: row.id,
      mine: row.senderId === userId,
      kind: row.kind === "voice" ? "voice" : row.kind === "photo" ? "photo" : "text",
      text: row.deletedAt || row.kind === "voice" ? "" : (row.text ?? "").trim(),
      voiceUrl: row.deletedAt || row.kind !== "voice" ? null : row.mediaUrl,
      voiceSec: row.kind === "voice" ? row.voiceSec ?? null : null,
      photos: row.deletedAt || row.kind !== "photo" ? null : (row.photos?.length ? row.photos : row.mediaUrl ? [row.mediaUrl] : []),
      replyToId: row.replyToId,
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
  const quoteOf = new Map(shown.map((line) => [line.id, line]));
  const missingQuotes = [...new Set(shown.map((line) => line.replyToId).filter((id): id is string => Boolean(id)))].filter((id) => !quoteOf.has(id));
  if (missingQuotes.length) {
    const extra = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        kind: messages.kind,
        text: messages.text,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(and(eq(messages.threadId, thread.id), inArray(messages.id, missingQuotes)));
    for (const row of extra) {
      quoteOf.set(row.id, {
        id: row.id,
        mine: row.senderId === userId,
        kind: row.kind === "voice" ? "voice" : row.kind === "photo" ? "photo" : "text",
        text: row.deletedAt ? "" : (row.text ?? "").trim(),
        deleted: Boolean(row.deletedAt),
        createdAt: "",
      });
    }
  }
  for (const line of shown) {
    const src = line.replyToId ? quoteOf.get(line.replyToId) : undefined;
    if (src) {
      line.replyTo = {
        id: src.id,
        mine: src.mine,
        kind: src.kind === "voice" ? "voice" : src.kind === "photo" ? "photo" : "text",
        text: src.deleted ? "" : src.text,
        deleted: Boolean(src.deleted),
      };
    }
    delete line.replyToId;
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
    firstUnreadId,
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

export async function sendChat(
  userId: string,
  threadId: string,
  raw: string,
  replyToId?: string | null,
): Promise<{ message: ChatLine } | Fail> {
  const text = raw.trim();
  if (!text || text.length > TEXT_MAX) return { error: "text", status: 400 };
  return postMessage(userId, threadId, { kind: "text", text, replyToId });
}

export async function sendVoiceChat(
  userId: string,
  threadId: string,
  voiceUrl: string,
  voiceSec: number,
  replyToId?: string | null,
): Promise<{ message: ChatLine } | Fail> {
  const sec = Math.round(Number(voiceSec));
  if (!Number.isFinite(sec) || sec < 1 || sec > 120) return { error: "voice", status: 400 };
  if (mediaUrlError([voiceUrl])) return { error: "media-not-uploaded", status: 400 };
  return postMessage(userId, threadId, { kind: "voice", voiceUrl, voiceSec: sec, replyToId });
}

export async function sendPhotoChat(
  userId: string,
  threadId: string,
  photos: string[],
  caption: string,
  replyToId?: string | null,
): Promise<{ message: ChatLine } | Fail> {
  const urls = photos.map((url) => url.trim()).filter(Boolean).slice(0, 5);
  if (!urls.length || urls.length > 5) return { error: "photo", status: 400 };
  if (mediaUrlError(urls)) return { error: "media-not-uploaded", status: 400 };
  const text = caption.trim().slice(0, TEXT_MAX);
  return postMessage(userId, threadId, { kind: "photo", photos: urls, text, replyToId });
}

async function postMessage(
  userId: string,
  threadId: string,
  body:
    | { kind: "text"; text: string; replyToId?: string | null }
    | { kind: "voice"; voiceUrl: string; voiceSec: number; replyToId?: string | null }
    | { kind: "photo"; photos: string[]; text: string; replyToId?: string | null },
): Promise<{ message: ChatLine } | Fail> {
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
    let replyId: string | null = null;
    if (body.replyToId) {
      const quoted = await tx
        .select({ id: messages.id, kind: messages.kind, text: messages.text, deletedAt: messages.deletedAt })
        .from(messages)
        .where(and(eq(messages.id, body.replyToId), eq(messages.threadId, thread.id)))
        .limit(1);
      if (!quoted[0]) return { error: "reply", status: 400 };
      replyId = quoted[0].id;
    }

    clearTyping(thread.id, userId);
    const now = new Date();
    const inserted = await tx
      .insert(messages)
      .values(
        body.kind === "voice"
          ? { threadId: thread.id, senderId: userId, kind: "voice", mediaUrl: body.voiceUrl, voiceSec: body.voiceSec, replyToId: replyId, createdAt: now }
          : body.kind === "photo"
            ? { threadId: thread.id, senderId: userId, kind: "photo", text: body.text || null, photos: body.photos, replyToId: replyId, createdAt: now }
            : { threadId: thread.id, senderId: userId, kind: "text", text: body.text, replyToId: replyId, createdAt: now },
      )
      .returning({ id: messages.id, createdAt: messages.createdAt });
    const row = inserted[0];
    if (!row) return { error: "save", status: 500 };
    await tx.update(threads).set({ lastMessageAt: now }).where(eq(threads.id, thread.id));

    const [sender, card, ask, quoted] = await Promise.all([
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
      replyId
        ? tx
            .select({ id: messages.id, senderId: messages.senderId, kind: messages.kind, text: messages.text, deletedAt: messages.deletedAt })
            .from(messages)
            .where(eq(messages.id, replyId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    await saveNotice(tx, {
      userId: peerId,
      type: "chat_message",
      listingId: thread.listingId,
      textKey: body.kind === "voice" ? "notifChatVoice" : body.kind === "photo" ? "notifChatPhoto" : "notifChat",
      params: {
        name: holdPersonName(sender[0]?.name),
        title: (card[0]?.title || ask[0]?.text || "").slice(0, 120),
        threadId: thread.id,
      },
      actorId: userId,
      chat: body.kind === "voice" ? { media: "voice" } : body.kind === "photo" ? { media: "photo" } : { preview: body.text },
    });
    const quote = quoted[0];
    return {
      message: {
        id: row.id,
        mine: true,
        kind: body.kind,
        text: body.kind === "text" ? body.text : body.kind === "photo" ? body.text : "",
        voiceUrl: body.kind === "voice" ? body.voiceUrl : null,
        voiceSec: body.kind === "voice" ? body.voiceSec : null,
        photos: body.kind === "photo" ? body.photos : null,
        replyTo: quote
          ? {
              id: quote.id,
              mine: quote.senderId === userId,
              kind: quote.kind === "voice" ? "voice" : quote.kind === "photo" ? "photo" : "text",
              text: quote.deletedAt ? "" : (quote.text ?? "").trim(),
              deleted: Boolean(quote.deletedAt),
            }
          : null,
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
