import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Listing, Shop } from "@/lib/types";
import { getDb } from "./db";
import { listings, shops, users } from "./db/schema";
import { rowToListing, rowToShop } from "./mappers";
import { bindNoticePushes, saveNotice } from "./notices";

/** Public ids of «Мастер-аккаунт» users, for the badge. A short list. */
export async function masterIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isMaster, true), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(500);
  return rows.map((row) => row.id);
}

/** Master or admin: may run points for sellers and has no personal daily limit. */
export async function isMasterOrAdmin(userId: string): Promise<boolean> {
  const rows = await getDb().select({ isAdmin: users.isAdmin, isMaster: users.isMaster }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.isAdmin === true || rows[0]?.isMaster === true;
}

export async function setMaster(adminId: string, userId: string, on: boolean): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  return bindNoticePushes(() =>
    db.transaction(async (tx) => {
      const before = await tx.select({ isMaster: users.isMaster }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
      if (!before[0]) return { error: "not-found", status: 404 };
      if (before[0].isMaster === on) return { ok: true as const };
      await tx.update(users).set({ isMaster: on, updatedAt: new Date() }).where(eq(users.id, userId));
      console.info("[audit] master-account", JSON.stringify({ at: new Date().toISOString(), admin: adminId, user: userId, on }));
      if (userId !== adminId) {
        await saveNotice(tx, {
          userId,
          type: "promoter",
          textKey: on ? "notifPromoterOn" : "notifPromoterOff",
          params: {},
          actorId: null,
        });
      }
      return { ok: true as const };
    }),
  );
}

/** «Назначить промоутера» by e-mail (case-insensitive). */
export async function assignPromoterByEmail(
  adminId: string,
  raw: string,
): Promise<{ ok: true; id: string } | { error: "no-user" | "already" | "bad-email"; status: number }> {
  const email = raw.trim().toLowerCase();
  if (!email.includes("@") || email.length > 200) return { error: "bad-email", status: 400 };
  const rows = await getDb()
    .select({ id: users.id, isMaster: users.isMaster })
    .from(users)
    .where(and(isNull(users.deletedAt), sql`lower(${users.email}) = ${email}`))
    .limit(2);
  if (rows.length !== 1) return { error: "no-user", status: 404 };
  if (rows[0].isMaster) return { error: "already", status: 409 };
  const done = await setMaster(adminId, rows[0].id, true);
  if ("error" in done) return { error: "no-user", status: 404 };
  return { ok: true, id: rows[0].id };
}

export type PromoterRow = { id: string; name: string; email: string; points: number; listings: number };

export async function listPromoters(): Promise<PromoterRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      points: sql<number>`(select count(*)::int from ${shops} s where s.owner_id = ${users.id} and s.status <> 'hidden')`,
      listings: sql<number>`(select count(*)::int from ${listings} l where l.owner_id = ${users.id} and l.shop_id is null and l.status <> 'hidden')`,
    })
    .from(users)
    .where(and(eq(users.isMaster, true), isNull(users.deletedAt)))
    .orderBy(desc(users.updatedAt))
    .limit(200);
  return rows.map((row) => ({ ...row, email: row.email ?? "", points: Number(row.points), listings: Number(row.listings) }));
}

/** Admin view of one account: every point and listing except moderation-hidden ones. */
export async function accountItemsForAdmin(
  userId: string,
): Promise<{ user: { id: string; name: string; email: string; master: boolean }; shops: Shop[]; listings: Listing[] } | null> {
  const db = getDb();
  const who = await db.select({ id: users.id, name: users.name, email: users.email, isMaster: users.isMaster }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
  if (!who[0]) return null;
  const shopRows = await db.select().from(shops).where(and(eq(shops.ownerId, userId), ne(shops.status, "hidden"))).orderBy(desc(shops.updatedAt)).limit(100);
  const listingRows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.ownerId, userId), isNull(listings.shopId), ne(listings.status, "hidden")))
    .orderBy(desc(listings.updatedAt))
    .limit(300);
  return {
    user: { id: who[0].id, name: who[0].name, email: who[0].email ?? "", master: who[0].isMaster === true },
    shops: shopRows.map(rowToShop),
    listings: listingRows.map(rowToListing),
  };
}
