import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { COMMENT_HOURLY_MAX, COMMENT_MAX, type CommentRow } from "@/lib/comments";
import { holdPersonName } from "@/lib/public-name";
import { sessionIsAdmin } from "./auth";
import { getDb } from "./db";
import { blocks, listingCommentLikes, listingComments, listings, reports, users } from "./db/schema";
import { bindNoticePushes, saveNotice } from "./notices";

type Fail = { error: string; status: number };

async function visibleListing(listingId: string) {
  const rows = await getDb()
    .select({ id: listings.id, ownerId: listings.ownerId, title: listings.title, status: listings.status, underReview: listings.underReview })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  const row = rows[0];
  if (!row || row.status === "hidden") return null;
  return row;
}

/** Comments under a listing. Hidden: deleted, banned/deleted authors, people the viewer blocked, and (for others) comments under review. */
export async function listComments(listingId: string, viewerId: string | null): Promise<{ comments: CommentRow[]; count: number } | Fail> {
  const listing = await visibleListing(listingId);
  if (!listing) return { error: "not-found", status: 404 };
  if (listing.underReview && listing.ownerId !== viewerId) return { error: "not-found", status: 404 };
  const db = getDb();
  const viewer = viewerId ?? "00000000-0000-0000-0000-000000000000";
  const rows = await db
    .select({
      id: listingComments.id,
      parentId: listingComments.parentId,
      authorId: listingComments.authorId,
      name: users.name,
      text: listingComments.text,
      createdAt: listingComments.createdAt,
      editedAt: listingComments.editedAt,
      underReview: listingComments.underReview,
      likes: sql<number>`(select count(*)::int from listing_comment_likes l where l.comment_id = ${listingComments.id})`,
      liked: sql<boolean>`exists(select 1 from listing_comment_likes l where l.comment_id = ${listingComments.id} and l.user_id = ${viewer}::uuid)`,
    })
    .from(listingComments)
    .innerJoin(users, eq(users.id, listingComments.authorId))
    .where(
      and(
        eq(listingComments.listingId, listingId),
        isNull(listingComments.deletedAt),
        isNull(users.bannedAt),
        isNull(users.deletedAt),
        viewerId
          ? sql`(${listingComments.underReview} = false or ${listingComments.authorId} = ${viewerId}::uuid)`
          : eq(listingComments.underReview, false),
        viewerId
          ? sql`not exists(select 1 from blocks b where b.blocker_id = ${viewerId}::uuid and b.blocked_user_id = ${listingComments.authorId})`
          : undefined,
      ),
    )
    .orderBy(asc(listingComments.createdAt))
    .limit(500);
  const top = new Set(rows.filter((row) => !row.parentId).map((row) => row.id));
  const comments: CommentRow[] = rows
    // A reply whose parent is gone (deleted, hidden, blocked) goes with it.
    .filter((row) => !row.parentId || top.has(row.parentId))
    .map((row) => ({
      id: row.id,
      parentId: row.parentId,
      authorId: row.authorId,
      author: holdPersonName(row.name),
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      likes: Number(row.likes) || 0,
      liked: Boolean(row.liked),
      mine: row.authorId === viewerId,
      canDelete: Boolean(viewerId) && (row.authorId === viewerId || listing.ownerId === viewerId),
      underReview: row.underReview,
    }));
  return { comments, count: comments.filter((row) => !row.underReview).length };
}

/** Public counts for cards: visible comments only. */
export async function commentCounts(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const rows = await getDb()
    .select({ listingId: listingComments.listingId, n: sql<number>`count(*)::int` })
    .from(listingComments)
    .innerJoin(users, eq(users.id, listingComments.authorId))
    .where(
      and(
        inArray(listingComments.listingId, ids),
        isNull(listingComments.deletedAt),
        eq(listingComments.underReview, false),
        isNull(users.bannedAt),
        isNull(users.deletedAt),
      ),
    )
    .groupBy(listingComments.listingId);
  const out: Record<string, number> = {};
  for (const row of rows) out[row.listingId] = Number(row.n) || 0;
  return out;
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text || text.length > COMMENT_MAX) return null;
  return text;
}

export async function addComment(
  userId: string,
  listingId: string,
  rawText: unknown,
  rawParentId: unknown,
): Promise<{ comment: CommentRow } | Fail> {
  const text = cleanText(rawText);
  if (!text) return { error: "text", status: 400 };
  const listing = await visibleListing(listingId);
  if (!listing || listing.underReview) return { error: "not-found", status: 404 };
  const db = getDb();
  if (listing.ownerId !== userId) {
    const blocked = await db
      .select({ id: blocks.blockerId })
      .from(blocks)
      .where(
        sql`(${blocks.blockerId} = ${listing.ownerId}::uuid and ${blocks.blockedUserId} = ${userId}::uuid)
          or (${blocks.blockerId} = ${userId}::uuid and ${blocks.blockedUserId} = ${listing.ownerId}::uuid)`,
      )
      .limit(1);
    if (blocked[0]) return { error: "blocked", status: 403 };
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listingComments)
    .where(and(eq(listingComments.authorId, userId), gt(listingComments.createdAt, since)));
  if (Number(recent[0]?.n ?? 0) >= COMMENT_HOURLY_MAX) return { error: "rate", status: 429 };

  let parentId: string | null = null;
  if (typeof rawParentId === "string" && rawParentId) {
    const parent = await db
      .select({ id: listingComments.id, parentId: listingComments.parentId, listingId: listingComments.listingId, deletedAt: listingComments.deletedAt })
      .from(listingComments)
      .where(eq(listingComments.id, rawParentId))
      .limit(1);
    const row = parent[0];
    if (!row || row.listingId !== listingId || row.deletedAt) return { error: "parent", status: 404 };
    // One reply level, as on Instagram: a reply to a reply joins the same thread.
    parentId = row.parentId ?? row.id;
  }

  return bindNoticePushes(async () => {
    const inserted = await db
      .insert(listingComments)
      .values({ listingId, authorId: userId, parentId, text })
      .returning();
    const row = inserted[0];
    if (!row) return { error: "save", status: 500 };
    const me = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const author = holdPersonName(me[0]?.name);
    if (listing.ownerId !== userId) {
      await saveNotice(db, {
        userId: listing.ownerId,
        type: "listing_comment",
        listingId,
        textKey: "notifComment",
        params: { name: author, title: (listing.title || "").slice(0, 120) },
        actorId: userId,
      });
    }
    return {
      comment: {
        id: row.id,
        parentId: row.parentId,
        authorId: userId,
        author,
        text: row.text,
        createdAt: row.createdAt.toISOString(),
        editedAt: null,
        likes: 0,
        liked: false,
        mine: true,
        canDelete: true,
        underReview: false,
      },
    };
  });
}

async function loadComment(id: string) {
  const rows = await getDb()
    .select({
      id: listingComments.id,
      authorId: listingComments.authorId,
      listingId: listingComments.listingId,
      deletedAt: listingComments.deletedAt,
      ownerId: listings.ownerId,
    })
    .from(listingComments)
    .innerJoin(listings, eq(listings.id, listingComments.listingId))
    .where(eq(listingComments.id, id))
    .limit(1);
  const row = rows[0];
  return row && !row.deletedAt ? row : null;
}

/** Author only, any time. */
export async function editComment(userId: string, id: string, rawText: unknown): Promise<{ ok: true; text: string; editedAt: string } | Fail> {
  const text = cleanText(rawText);
  if (!text) return { error: "text", status: 400 };
  const row = await loadComment(id);
  if (!row) return { error: "not-found", status: 404 };
  if (row.authorId !== userId) return { error: "forbidden", status: 403 };
  const now = new Date();
  await getDb().update(listingComments).set({ text, editedAt: now }).where(eq(listingComments.id, id));
  return { ok: true, text, editedAt: now.toISOString() };
}

/** Soft delete. Author, the listing owner, or an admin (moderation). Open reports on it are closed. */
export async function deleteComment(userId: string, id: string): Promise<{ ok: true } | Fail> {
  const row = await loadComment(id);
  if (!row) return { error: "not-found", status: 404 };
  const allowed = row.authorId === userId || row.ownerId === userId || (await sessionIsAdmin(userId));
  if (!allowed) return { error: "forbidden", status: 403 };
  await hideCommentById(id);
  return { ok: true };
}

export async function hideCommentById(id: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db.update(listingComments).set({ deletedAt: now, underReview: false }).where(eq(listingComments.id, id));
  await db
    .update(reports)
    .set({ status: "hidden", handledAt: now })
    .where(and(eq(reports.commentId, id), eq(reports.status, "new")));
}

export async function keepComment(id: string): Promise<{ ok: true } | Fail> {
  const db = getDb();
  const rows = await db.select({ id: listingComments.id }).from(listingComments).where(eq(listingComments.id, id)).limit(1);
  if (!rows[0]) return { error: "not-found", status: 404 };
  const now = new Date();
  await db.update(listingComments).set({ underReview: false }).where(eq(listingComments.id, id));
  await db
    .update(reports)
    .set({ status: "dismissed", handledAt: now })
    .where(and(eq(reports.commentId, id), eq(reports.status, "new")));
  return { ok: true };
}

export async function commentAuthor(id: string): Promise<string | null> {
  const rows = await getDb().select({ authorId: listingComments.authorId }).from(listingComments).where(eq(listingComments.id, id)).limit(1);
  return rows[0]?.authorId ?? null;
}

/** Tap ♥: like or unlike. */
export async function toggleCommentLike(userId: string, id: string): Promise<{ liked: boolean; likes: number } | Fail> {
  const row = await loadComment(id);
  if (!row) return { error: "not-found", status: 404 };
  const db = getDb();
  const removed = await db
    .delete(listingCommentLikes)
    .where(and(eq(listingCommentLikes.commentId, id), eq(listingCommentLikes.userId, userId)))
    .returning({ id: listingCommentLikes.commentId });
  if (!removed.length) await db.insert(listingCommentLikes).values({ commentId: id, userId }).onConflictDoNothing();
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listingCommentLikes)
    .where(eq(listingCommentLikes.commentId, id));
  return { liked: !removed.length, likes: Number(count[0]?.n ?? 0) };
}
