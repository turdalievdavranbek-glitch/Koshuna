import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { releaseCourierOffers } from "./delivery-dispatch";
import { deliveryNoShows, deliveryRatings, orders, shops, users } from "./db/schema";

const PAUSE_MS = 48 * 60 * 60 * 1000;
const RATING_FLOOR = 3.5;
const RATING_MIN = 5;
const NOSHOW_COUNT = 2;
const NOSHOW_MS = 7 * 24 * 60 * 60 * 1000;
const BAN_AFTER = 3;
const SHOP_RATE = 0.2;
const SHOP_MIN = 5;

export function courierIsPaused(row: { courierSoftBanned: boolean; courierPausedUntil: Date | null }): boolean {
  if (row.courierSoftBanned) return true;
  return row.courierPausedUntil != null && row.courierPausedUntil.getTime() > Date.now();
}

/** Low rating after 5 deliveries, or 2 no-shows in 7 days, pauses for 48 hours. The third pause soft-bans. */
export async function reviewCourier(courierId: string): Promise<void> {
  const db = getDb();
  const who = await db
    .select({
      soft: users.courierSoftBanned,
      until: users.courierPausedUntil,
      pauses: users.courierPauseCount,
    })
    .from(users)
    .where(eq(users.id, courierId))
    .limit(1);
  const row = who[0];
  if (!row || row.soft) return;
  if (row.until && row.until.getTime() > Date.now()) return;

  const stars = await db
    .select({
      n: sql<number>`count(${deliveryRatings.courierStars})::int`,
      avg: sql<number>`avg(${deliveryRatings.courierStars})`,
    })
    .from(deliveryRatings)
    .innerJoin(orders, eq(orders.id, deliveryRatings.orderId))
    .where(eq(orders.courierId, courierId));
  const count = Number(stars[0]?.n ?? 0);
  const avg = Number(stars[0]?.avg ?? 0);
  const since = new Date(Date.now() - NOSHOW_MS);
  const shows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(deliveryNoShows)
    .where(and(eq(deliveryNoShows.courierId, courierId), gte(deliveryNoShows.createdAt, since)));
  const noShows = Number(shows[0]?.n ?? 0);
  const low = count >= RATING_MIN && avg < RATING_FLOOR;
  if (!low && noShows < NOSHOW_COUNT) return;

  const pauses = row.pauses + 1;
  if (pauses >= BAN_AFTER) {
    await db
      .update(users)
      .set({ courierSoftBanned: true, courierPauseCount: pauses, courierPausedUntil: null, courierOnline: false, updatedAt: new Date() })
      .where(eq(users.id, courierId));
    await releaseCourierOffers(courierId).catch(() => undefined);
    return;
  }
  await db
    .update(users)
    .set({
      courierPauseCount: pauses,
      courierPausedUntil: new Date(Date.now() + PAUSE_MS),
      courierOnline: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, courierId));
  await releaseCourierOffers(courierId).catch(() => undefined);
}

export async function recordNoShow(courierId: string, orderId: string): Promise<void> {
  await getDb().insert(deliveryNoShows).values({ courierId, orderId });
  await reviewCourier(courierId);
}

/** More than 20% shop cancels, once there are at least 5 orders, turns delivery off. */
export async function reviewShop(shopId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({
      n: sql<number>`count(*)::int`,
      bad: sql<number>`count(*) filter (where ${orders.status} = 'rejected' or (${orders.status} = 'cancelled' and ${orders.cancelReason} in ('shop','shop-timeout')))::int`,
    })
    .from(orders)
    .where(eq(orders.shopId, shopId));
  const total = Number(rows[0]?.n ?? 0);
  const bad = Number(rows[0]?.bad ?? 0);
  if (total < SHOP_MIN || bad / total <= SHOP_RATE) return;
  await db.update(shops).set({ deliveryEnabled: false, updatedAt: new Date() }).where(eq(shops.id, shopId));
}

export async function rateDelivery(
  userId: string,
  orderId: string,
  courierStars: number,
  shopStars: number,
): Promise<{ ok: true } | { error: string; status: number }> {
  if (!Number.isInteger(courierStars) || courierStars < 1 || courierStars > 5) return { error: "bad-stars", status: 400 };
  if (!Number.isInteger(shopStars) || shopStars < 1 || shopStars > 5) return { error: "bad-stars", status: 400 };
  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order || order.buyerId !== userId) return { error: "forbidden", status: 403 };
  if (order.status !== "delivered") return { error: "state", status: 409 };
  await db
    .insert(deliveryRatings)
    .values({ orderId, raterId: userId, courierStars, shopStars })
    .onConflictDoNothing();
  if (order.courierId) await reviewCourier(order.courierId);
  return { ok: true };
}

export async function shopRating(shopId: string): Promise<{ rating: number | null; count: number }> {
  const rows = await getDb()
    .select({
      n: sql<number>`count(${deliveryRatings.shopStars})::int`,
      avg: sql<number>`avg(${deliveryRatings.shopStars})`,
    })
    .from(deliveryRatings)
    .innerJoin(orders, eq(orders.id, deliveryRatings.orderId))
    .where(eq(orders.shopId, shopId));
  const count = Number(rows[0]?.n ?? 0);
  if (!count) return { rating: null, count: 0 };
  return { rating: Math.round(Number(rows[0]?.avg ?? 0) * 10) / 10, count };
}
