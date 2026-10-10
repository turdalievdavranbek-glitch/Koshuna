import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Shop } from "@/lib/types";
import { getDb, type Db } from "./db";
import { listingComments, listings, reports, sessions, shops, users } from "./db/schema";
import { rowToShop } from "./mappers";

/** Personal listings without a point, per rolling 24 hours. */
export const PERSONAL_DAILY_MAX = 3;
/** Distinct signed-in reporters before a card is hidden for review. */
export const REVIEW_REPORTS = 3;

const POINT_LISTING = ["active", "promoted", "reserved"] as const;

type Executor = Pick<Db, "select">;

export type ModerationItem = {
  kind: "listing" | "shop" | "comment";
  id: string;
  title: string;
  label: "listing" | "point" | "service" | "comment";
  /** Comment: the listing it was written under. */
  listingId?: string;
  underReview: boolean;
  reportCount: number;
  reasons: string[];
  ownerId: string;
  ownerName: string;
  latestAt: string;
};

/**
 * A registered point is an active shop/stall or an active service card.
 * Users with one are not limited. Everyone else: at most 3 personal listings per rolling 24h.
 */
export async function personalLimitReached(tx: Executor, userId: string): Promise<boolean> {
  const point = await tx
    .select({ id: shops.id })
    .from(shops)
    .where(and(eq(shops.ownerId, userId), eq(shops.status, "active")))
    .limit(1);
  if (point[0]) return false;
  const service = await tx
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.ownerId, userId), eq(listings.section, "services"), inArray(listings.status, [...POINT_LISTING])))
    .limit(1);
  if (service[0]) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.ownerId, userId), isNull(listings.shopId), gt(listings.createdAt, since)));
  return Number(rows[0]?.n ?? 0) >= PERSONAL_DAILY_MAX;
}

export async function insertPersonalListing(
  userId: string,
  values: typeof listings.$inferInsert,
): Promise<{ row: typeof listings.$inferSelect } | { error: "daily-limit" }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (await personalLimitReached(tx, userId)) return { error: "daily-limit" };
    const inserted = await tx.insert(listings).values(values).returning();
    if (!inserted[0]) throw new Error("save");
    return { row: inserted[0] };
  });
}

async function distinctReporters(
  tx: Pick<Db, "select">,
  target: { listingId?: string; shopId?: string; commentId?: string },
): Promise<number> {
  const where = target.listingId
    ? and(eq(reports.listingId, target.listingId), eq(reports.status, "new"), isNotNull(reports.reporterId))
    : target.commentId
      ? and(eq(reports.commentId, target.commentId), eq(reports.status, "new"), isNotNull(reports.reporterId))
      : and(eq(reports.shopId, target.shopId ?? ""), eq(reports.status, "new"), isNotNull(reports.reporterId));
  const rows = await tx
    .select({ n: sql<number>`count(distinct ${reports.reporterId})::int` })
    .from(reports)
    .where(where);
  return Number(rows[0]?.n ?? 0);
}

/** After a new report: hide the card once 3 different signed-in people have open reports. */
export async function maybeHideForReview(target: {
  listingId?: string | null;
  shopId?: string | null;
  commentId?: string | null;
}): Promise<void> {
  const db = getDb();
  if (target.commentId) {
    const n = await distinctReporters(db, { commentId: target.commentId });
    if (n >= REVIEW_REPORTS) {
      await db
        .update(listingComments)
        .set({ underReview: true })
        .where(and(eq(listingComments.id, target.commentId), isNull(listingComments.deletedAt)));
    }
  }
  if (target.listingId) {
    const n = await distinctReporters(db, { listingId: target.listingId });
    if (n >= REVIEW_REPORTS) {
      await db
        .update(listings)
        .set({ underReview: true, updatedAt: new Date() })
        .where(and(eq(listings.id, target.listingId), sql`${listings.status} <> 'hidden'`));
    }
  }
  if (target.shopId) {
    const n = await distinctReporters(db, { shopId: target.shopId });
    if (n >= REVIEW_REPORTS) {
      await db
        .update(shops)
        .set({ underReview: true, updatedAt: new Date() })
        .where(and(eq(shops.id, target.shopId), sql`${shops.status} <> 'hidden'`));
    }
  }
}

type ReportRow = { reason: string; reporterId: string | null; createdAt: Date };

function groupReports(rows: ReportRow[]): { count: number; reasons: string[]; latestAt: Date | null } {
  const reporters = new Set<string>();
  const reasons: string[] = [];
  let latestAt: Date | null = null;
  for (const row of rows) {
    if (row.reporterId) reporters.add(row.reporterId);
    if (row.reason && !reasons.includes(row.reason)) reasons.push(row.reason);
    if (!latestAt || row.createdAt > latestAt) latestAt = row.createdAt;
  }
  return { count: reporters.size, reasons, latestAt };
}

export async function moderationQueue(): Promise<ModerationItem[]> {
  const db = getDb();
  const open = await db
    .select({
      listingId: reports.listingId,
      shopId: reports.shopId,
      reason: reports.reason,
      reporterId: reports.reporterId,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(and(eq(reports.status, "new"), sql`(${reports.listingId} is not null or ${reports.shopId} is not null)`))
    .orderBy(desc(reports.createdAt));

  const byListing = new Map<string, ReportRow[]>();
  const byShop = new Map<string, ReportRow[]>();
  for (const row of open) {
    const packed = { reason: row.reason, reporterId: row.reporterId, createdAt: row.createdAt };
    if (row.listingId) {
      const list = byListing.get(row.listingId) ?? [];
      list.push(packed);
      byListing.set(row.listingId, list);
    } else if (row.shopId) {
      const list = byShop.get(row.shopId) ?? [];
      list.push(packed);
      byShop.set(row.shopId, list);
    }
  }

  const reviewedListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.underReview, true), sql`${listings.status} <> 'hidden'`));
  const reviewedShops = await db
    .select({ id: shops.id })
    .from(shops)
    .where(and(eq(shops.underReview, true), sql`${shops.status} <> 'hidden'`));

  const listingIds = [...new Set([...byListing.keys(), ...reviewedListings.map((row) => row.id)])];
  const shopIds = [...new Set([...byShop.keys(), ...reviewedShops.map((row) => row.id)])];

  const listingRows = listingIds.length
    ? await db.select().from(listings).where(inArray(listings.id, listingIds))
    : [];
  const shopRows = shopIds.length ? await db.select().from(shops).where(inArray(shops.id, shopIds)) : [];
  const ownerIds = [
    ...new Set([
      ...listingRows.map((row) => row.ownerId),
      ...shopRows.map((row) => row.ownerId),
    ]),
  ];
  const ownerRows = ownerIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ownerIds))
    : [];
  const names = new Map(ownerRows.map((row) => [row.id, row.name]));

  const items: ModerationItem[] = [];
  for (const row of listingRows) {
    if (row.status === "hidden") continue;
    const grouped = groupReports(byListing.get(row.id) ?? []);
    if (!row.underReview && grouped.count === 0) continue;
    items.push({
      kind: "listing",
      id: row.id,
      title: row.title || row.id,
      label: row.section === "services" ? "service" : "listing",
      underReview: row.underReview,
      reportCount: grouped.count,
      reasons: grouped.reasons,
      ownerId: row.ownerId,
      ownerName: names.get(row.ownerId) || "",
      latestAt: (grouped.latestAt ?? row.updatedAt).toISOString(),
    });
  }
  for (const row of shopRows) {
    if (row.status === "hidden") continue;
    const grouped = groupReports(byShop.get(row.id) ?? []);
    if (!row.underReview && grouped.count === 0) continue;
    const shop = rowToShop(row);
    items.push({
      kind: "shop",
      id: row.id,
      title: shop.name || row.name || row.id,
      label: "point",
      underReview: row.underReview,
      reportCount: grouped.count,
      reasons: grouped.reasons,
      ownerId: row.ownerId,
      ownerName: names.get(row.ownerId) || shop.ownerName || "",
      latestAt: (grouped.latestAt ?? row.updatedAt).toISOString(),
    });
  }
  items.push(...(await commentQueue()));
  items.sort((a, b) => (a.latestAt < b.latestAt ? 1 : a.latestAt > b.latestAt ? -1 : 0));
  return items;
}

export async function hideListingById(id: string): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const row = existing[0];
  if (!row) return { error: "not-found", status: 404 };
  const now = new Date();
  await db.update(listings).set({ status: "hidden", underReview: false, updatedAt: now }).where(eq(listings.id, id));
  if (row.shopId && row.shopProductId) {
    const shopRows = await db.select().from(shops).where(eq(shops.id, row.shopId)).limit(1);
    const shopRow = shopRows[0];
    if (shopRow) {
      const shop = rowToShop(shopRow);
      const products = (shop.products ?? []).map((product) =>
        product.id === row.shopProductId ? { ...product, published: false, updatedAt: now.toISOString() } : product,
      );
      await db.update(shops).set({ doc: { ...shop, products }, updatedAt: now }).where(eq(shops.id, shopRow.id));
    }
  }
  await db
    .update(reports)
    .set({ status: "hidden", handledAt: now })
    .where(and(eq(reports.listingId, id), eq(reports.status, "new")));
  return { ok: true };
}

export async function keepTarget(kind: "listing" | "shop", id: string): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  const now = new Date();
  if (kind === "listing") {
    const existing = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing[0]) return { error: "not-found", status: 404 };
    await db.update(listings).set({ underReview: false, updatedAt: now }).where(eq(listings.id, id));
    await db
      .update(reports)
      .set({ status: "dismissed", handledAt: now })
      .where(and(eq(reports.listingId, id), eq(reports.status, "new")));
    return { ok: true };
  }
  const existing = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id)).limit(1);
  if (!existing[0]) return { error: "not-found", status: 404 };
  await db.update(shops).set({ underReview: false, updatedAt: now }).where(eq(shops.id, id));
  await db
    .update(reports)
    .set({ status: "dismissed", handledAt: now })
    .where(and(eq(reports.shopId, id), eq(reports.status, "new")));
  return { ok: true };
}

async function hideOwned(ownerId: string, now: Date) {
  const db = getDb();
  const owned = await db.select().from(shops).where(eq(shops.ownerId, ownerId));
  for (const row of owned) {
    if (row.status === "hidden") continue;
    const shop = { ...rowToShop(row), status: "hidden" as const, underReview: false, updatedAt: now.toISOString() };
    await db.update(shops).set({ status: "hidden", underReview: false, updatedAt: now, doc: shop }).where(eq(shops.id, row.id));
  }
  await db.update(listings).set({ status: "hidden", underReview: false, updatedAt: now }).where(eq(listings.ownerId, ownerId));
  if (owned.length) {
    await db
      .update(listings)
      .set({ status: "hidden", underReview: false, updatedAt: now })
      .where(inArray(listings.shopId, owned.map((row) => row.id)));
  }
  await db.execute(sql`
    update reports set status = 'hidden', handled_at = ${now}
    where status = 'new' and (
      target_user_id = ${ownerId}::uuid
      or listing_id in (select id from listings where owner_id = ${ownerId}::uuid)
      or shop_id in (select id from shops where owner_id = ${ownerId}::uuid)
    )
  `);
}

/** Ban: cannot sign in (sessions cleared, banned_at set) or post; their cards are hidden. */
export async function banAuthor(adminId: string, authorId: string): Promise<{ ok: true } | { error: string; status: number }> {
  if (!authorId || authorId === adminId) return { error: "forbidden", status: 403 };
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, authorId)).limit(1);
  const author = rows[0];
  if (!author || author.deletedAt) return { error: "not-found", status: 404 };
  if (author.isAdmin) return { error: "forbidden", status: 403 };
  const now = new Date();
  await db.update(users).set({ bannedAt: now, updatedAt: now }).where(eq(users.id, authorId));
  await db.delete(sessions).where(eq(sessions.userId, authorId));
  await hideOwned(authorId, now);
  return { ok: true };
}

/** Drop shop goods whose listing is under review. Owners still receive every product. */
export async function shopsForViewer<T extends Shop>(list: T[], viewerId: string | null): Promise<T[]> {
  if (!list.length) return list;
  const ids = list.filter((shop) => shop.ownerId !== viewerId).map((shop) => shop.id);
  if (!ids.length) return list;
  const flagged = await getDb()
    .select({ shopId: listings.shopId, shopProductId: listings.shopProductId })
    .from(listings)
    .where(and(eq(listings.underReview, true), inArray(listings.shopId, ids), isNotNull(listings.shopProductId)));
  if (!flagged.length) return list;
  const hidden = new Map<string, Set<string>>();
  for (const row of flagged) {
    if (!row.shopId || !row.shopProductId) continue;
    const set = hidden.get(row.shopId) ?? new Set<string>();
    set.add(row.shopProductId);
    hidden.set(row.shopId, set);
  }
  return list.map((shop) => {
    const drop = shop.ownerId === viewerId ? undefined : hidden.get(shop.id);
    if (!drop?.size) return shop;
    return { ...shop, products: shop.products.filter((product) => !drop.has(product.id)) };
  });
}

/** Reported or auto-hidden comments, same 3-reporter rule as listings. */
async function commentQueue(): Promise<ModerationItem[]> {
  const db = getDb();
  const open = await db
    .select({ commentId: reports.commentId, reason: reports.reason, reporterId: reports.reporterId, createdAt: reports.createdAt })
    .from(reports)
    .where(and(eq(reports.status, "new"), isNotNull(reports.commentId)));
  const byComment = new Map<string, ReportRow[]>();
  for (const row of open) {
    if (!row.commentId) continue;
    const list = byComment.get(row.commentId) ?? [];
    list.push({ reason: row.reason, reporterId: row.reporterId, createdAt: row.createdAt });
    byComment.set(row.commentId, list);
  }
  const reviewed = await db
    .select({ id: listingComments.id })
    .from(listingComments)
    .where(and(eq(listingComments.underReview, true), isNull(listingComments.deletedAt)));
  const ids = [...new Set([...byComment.keys(), ...reviewed.map((row) => row.id)])];
  if (!ids.length) return [];
  const rows = await db
    .select({
      id: listingComments.id,
      listingId: listingComments.listingId,
      authorId: listingComments.authorId,
      text: listingComments.text,
      underReview: listingComments.underReview,
      deletedAt: listingComments.deletedAt,
      createdAt: listingComments.createdAt,
      name: users.name,
    })
    .from(listingComments)
    .innerJoin(users, eq(users.id, listingComments.authorId))
    .where(inArray(listingComments.id, ids));
  const items: ModerationItem[] = [];
  for (const row of rows) {
    if (row.deletedAt) continue;
    const grouped = groupReports(byComment.get(row.id) ?? []);
    if (!row.underReview && grouped.count === 0) continue;
    items.push({
      kind: "comment",
      id: row.id,
      title: row.text.slice(0, 200),
      label: "comment",
      listingId: row.listingId,
      underReview: row.underReview,
      reportCount: grouped.count,
      reasons: grouped.reasons,
      ownerId: row.authorId,
      ownerName: row.name || "",
      latestAt: (grouped.latestAt ?? row.createdAt).toISOString(),
    });
  }
  return items;
}
