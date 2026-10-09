import { and, eq, inArray, isNotNull, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { CIRCLE_MAX } from "@/lib/circles";
import { getDb } from "./db";
import {
  accountDeletions,
  cartItems,
  circlePicks,
  devices,
  listings,
  media,
  notifications,
  purchaseRequests,
  reactions,
  reservations,
  sessions,
  shops,
  subscriptions,
  userAuth,
  users,
} from "./db/schema";
import { rowToShop } from "./mappers";
import { closeExpiredPurchaseRequests } from "./purchase-requests";
import { partPath, removeFile } from "./media";

/** Price-stats job is Шаг 24. The table stays; this step does not fill it. */

export async function listingReminders(): Promise<{ ok: true; counts: Record<string, number> }> {
  const db = getDb();
  const due = await db
    .select()
    .from(listings)
    .where(and(inArray(listings.status, ["active", "promoted"]), eq(listings.underReview, false), lt(listings.expiresAt, new Date()), isNull(listings.reminderSentAt)));
  let reminders = 0;
  for (const row of due) {
    const wrote = await db.transaction(async (tx) => {
      const fresh = await tx
        .select({ id: listings.id })
        .from(listings)
        .where(and(eq(listings.id, row.id), isNull(listings.reminderSentAt)))
        .limit(1);
      if (!fresh[0]) return false;
      await tx.insert(notifications).values({
        userId: row.ownerId,
        type: "listing_still_actual",
        listingId: row.id,
        textKey: "notifStillActual",
        params: {},
      });
      await tx.update(listings).set({ reminderSentAt: new Date(), updatedAt: new Date() }).where(eq(listings.id, row.id));
      return true;
    });
    if (wrote) reminders += 1;
  }
  let expired = 0;
  if (process.env.LISTING_AUTO_EXPIRE === "true") {
    const grace = Number(process.env.LISTING_GRACE_DAYS || 7);
    const days = Number.isFinite(grace) && grace > 0 ? grace : 7;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const rows = await db
      .update(listings)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          inArray(listings.status, ["active", "promoted"]),
          isNotNull(listings.reminderSentAt),
          lt(listings.reminderSentAt, cutoff),
          or(isNull(listings.lastConfirmedAt), sql`${listings.lastConfirmedAt} < ${listings.reminderSentAt}`),
        ),
      )
      .returning({ id: listings.id });
    expired = rows.length;
  }
  return { ok: true, counts: { reminders, expired } };
}

/** Owner account removal. Listings and points are hidden (not hard-deleted). Session, login, and profile fields are cleared. */
export async function wipeUser(userId: string) {
  const db = getDb();
  await db.execute(sql`
    UPDATE listings SET likes = GREATEST(likes - sub.n, 0)
    FROM (
      SELECT listing_id, count(*)::int AS n FROM reactions
      WHERE user_id = ${userId}::uuid AND value = 'like'
      GROUP BY listing_id
    ) AS sub
    WHERE listings.id = sub.listing_id
  `);
  await db.execute(sql`
    UPDATE listings SET dislikes = GREATEST(dislikes - sub.n, 0)
    FROM (
      SELECT listing_id, count(*)::int AS n FROM reactions
      WHERE user_id = ${userId}::uuid AND value = 'dislike'
      GROUP BY listing_id
    ) AS sub
    WHERE listings.id = sub.listing_id
  `);

  const files = await db.select().from(media).where(eq(media.ownerId, userId));
  for (const row of files) {
    if (row.path) await removeFile(row.path).catch(() => undefined);
    await removeFile(partPath(row.id)).catch(() => undefined);
  }

  const now = new Date();
  const ownedShops = await db.select().from(shops).where(eq(shops.ownerId, userId));
  for (const row of ownedShops) {
    const shop = { ...rowToShop(row), status: "hidden" as const, updatedAt: now.toISOString() };
    await db.update(shops).set({ status: "hidden", updatedAt: now, doc: shop }).where(eq(shops.id, row.id));
  }
  await db.update(listings).set({ status: "hidden", updatedAt: now }).where(eq(listings.ownerId, userId));
  if (ownedShops.length) {
    await db.update(listings).set({ status: "hidden", updatedAt: now }).where(inArray(listings.shopId, ownedShops.map((row) => row.id)));
  }

  await db.delete(reactions).where(eq(reactions.userId, userId));
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  await db.delete(devices).where(eq(devices.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(userAuth).where(eq(userAuth.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(reservations).where(eq(reservations.buyerId, userId));
  await db.delete(purchaseRequests).where(eq(purchaseRequests.buyerId, userId));
  await db.delete(media).where(eq(media.ownerId, userId));
  await db
    .update(users)
    .set({
      name: "",
      phone: null,
      email: null,
      avatarUrl: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function accountDeletionsJob(): Promise<{ ok: true; counts: Record<string, number> }> {
  const db = getDb();
  const pending = await db.select().from(accountDeletions).where(isNull(accountDeletions.completedAt));
  let completed = 0;
  for (const row of pending) {
    await wipeUser(row.userId);
    await db.update(accountDeletions).set({ completedAt: new Date() }).where(eq(accountDeletions.id, row.id));
    completed += 1;
  }
  return { ok: true, counts: { completed } };
}

export async function cleanupJob(): Promise<{ ok: true; counts: Record<string, number> }> {
  const db = getDb();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const stale = await db
    .select()
    .from(media)
    .where(and(eq(media.uploadStatus, "uploading"), lt(media.createdAt, dayAgo)));
  for (const row of stale) {
    await removeFile(partPath(row.id)).catch(() => undefined);
    if (row.path && !row.path.startsWith("tmp/")) await removeFile(row.path).catch(() => undefined);
  }
  if (stale.length) await db.delete(media).where(inArray(media.id, stale.map((row) => row.id)));

  const orphans = await db
    .select()
    .from(media)
    .where(and(eq(media.uploadStatus, "ready"), isNull(media.listingId), isNull(media.shopId), lt(media.createdAt, weekAgo)));
  for (const row of orphans) {
    if (row.path) await removeFile(row.path).catch(() => undefined);
  }
  if (orphans.length) await db.delete(media).where(inArray(media.id, orphans.map((row) => row.id)));

  const gone = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  const requests = await closeExpiredPurchaseRequests();
  return { ok: true, counts: { uploading: stale.length, orphans: orphans.length, sessions: gone.length, requests } };
}

/**
 * Top public videos per city, by like reactions only.
 * One transaction deletes and inserts that city's rows.
 * Hidden, under review, and banned authors never get a row.
 */
export async function circlesJob(): Promise<{ ok: true; counts: Record<string, number> }> {
  const db = getDb();
  const result = await db.execute(sql`
    select ${listings.id} as id, ${listings.city} as city, count(${reactions.userId})::int as likes
    from ${listings}
    inner join ${users} on ${users.id} = ${listings.ownerId}
    left join ${shops} on ${shops.id} = ${listings.shopId}
    left join ${reactions} on ${reactions.listingId} = ${listings.id} and ${reactions.value} = 'like'
    where ${listings.status} in ('active', 'promoted', 'reserved')
      and ${listings.underReview} = false
      and (${listings.hasVideo} = true or (${listings.videoUrl} is not null and ${listings.videoUrl} <> ''))
      and (${listings.shopId} is null or (${shops.status} = 'active' and ${shops.underReview} = false))
      and ${users.bannedAt} is null
      and ${users.deletedAt} is null
      and ${listings.city} <> ''
    group by ${listings.id}, ${listings.city}, ${listings.createdAt}
    order by count(${reactions.userId}) desc, ${listings.createdAt} desc
  `);
  if (!Array.isArray(result)) throw new Error("circles job: unexpected query result");
  const byCity = new Map<string, string[]>();
  for (const raw of result) {
    const row = raw as { id?: unknown; city?: unknown };
    const city = typeof row.city === "string" ? row.city : "";
    const id = typeof row.id === "string" ? row.id : "";
    if (!city || !id) continue;
    const list = byCity.get(city) ?? [];
    if (list.length >= CIRCLE_MAX) continue;
    list.push(id);
    byCity.set(city, list);
  }

  const now = new Date();
  let picks = 0;
  for (const [city, ids] of byCity) {
    await db.transaction(async (tx) => {
      await tx.delete(circlePicks).where(eq(circlePicks.city, city));
      if (!ids.length) return;
      await tx.insert(circlePicks).values(
        ids.map((listingId, index) => ({
          city,
          listingId,
          rank: index + 1,
          computedAt: now,
        })),
      );
    });
    picks += ids.length;
  }

  const cities = [...byCity.keys()];
  if (cities.length) await db.delete(circlePicks).where(notInArray(circlePicks.city, cities));
  else await db.delete(circlePicks);

  return { ok: true, counts: { cities: cities.length, picks } };
}

export const JOBS = {
  "listing-reminders": listingReminders,
  "account-deletions": accountDeletionsJob,
  cleanup: cleanupJob,
  circles: circlesJob,
} as const;
