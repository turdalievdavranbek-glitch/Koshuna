import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { haversineKm } from "@/lib/geo";
import { getDb } from "./db";
import { orderOffers, orders, shops, users } from "./db/schema";
import { bindNoticePushes, saveNotice } from "./notices";

const OFFER_MS = 45_000;

function radiusKm(): number {
  const raw = Number(process.env.DELIVERY_COURIER_RADIUS_KM);
  if (!Number.isFinite(raw) || raw <= 0 || raw > 100) return 10;
  return raw;
}

function paused(row: { courierSoftBanned: boolean; courierPausedUntil: Date | null }): boolean {
  if (row.courierSoftBanned) return true;
  return row.courierPausedUntil != null && row.courierPausedUntil.getTime() > Date.now();
}

/** Offer the assembled, confirmed order to the nearest online courier who has not been asked yet. */
export async function offerNext(orderId: string): Promise<void> {
  const db = getDb();
  const picked = await db.transaction(async (tx) => {
    const locked = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    const order = locked[0];
    if (!order || order.status !== "assembled" || !order.buyerConfirmedAt || order.courierId) return null;
    const live = await tx
      .select({ id: orderOffers.id })
      .from(orderOffers)
      .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, "offered"), gt(orderOffers.expiresAt, new Date())))
      .limit(1);
    if (live[0]) return null;
    const shopRows = await tx.select().from(shops).where(eq(shops.id, order.shopId)).limit(1);
    const shop = shopRows[0];
    if (!shop) return null;
    const past = await tx.select({ courierId: orderOffers.courierId }).from(orderOffers).where(eq(orderOffers.orderId, orderId));
    const asked = new Set(past.map((item) => item.courierId));
    const couriers = await tx
    .select({
      id: users.id,
      lat: users.lastLat,
      lng: users.lastLng,
      city: users.courierCity,
      soft: users.courierSoftBanned,
      pausedUntil: users.courierPausedUntil,
    })
    .from(users)
    .where(
      and(
        eq(users.isCourier, true),
        eq(users.courierOnline, true),
        eq(users.courierSoftBanned, false),
        isNull(users.deletedAt),
        isNull(users.bannedAt),
        shop.city ? eq(users.courierCity, shop.city) : sql`true`,
      ),
    )
    .limit(200);

    const busy = await tx
    .select({ courierId: orders.courierId })
    .from(orders)
    .where(and(isNotNull(orders.courierId), inArray(orders.status, ["assigned", "picked_up", "refused"])));
  const held = new Set(busy.map((item) => item.courierId).filter((id): id is string => Boolean(id)));
  const radius = radiusKm();
  const ranked = couriers
    .filter((courier) => {
      if (asked.has(courier.id) || held.has(courier.id)) return false;
      if (courier.id === order.buyerId || courier.id === shop.ownerId) return false;
      if (paused({ courierSoftBanned: courier.soft, courierPausedUntil: courier.pausedUntil })) return false;
      if (shop.lat == null || shop.lng == null || courier.lat == null || courier.lng == null) return true;
      return haversineKm(courier.lat, courier.lng, shop.lat, shop.lng) <= radius;
    })
    .map((courier) => ({
      id: courier.id,
      km:
        shop.lat != null && shop.lng != null && courier.lat != null && courier.lng != null
          ? haversineKm(courier.lat, courier.lng, shop.lat, shop.lng)
          : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.km - b.km);

    const next = ranked[0];
    if (!next) return null;
    const expiresAt = new Date(Date.now() + OFFER_MS);
    try {
      await tx.insert(orderOffers).values({ orderId, courierId: next.id, expiresAt, status: "offered" });
    } catch {
      return null;
    }
    return { courierId: next.id, publicNo: order.publicNo, shopId: order.shopId };
  });
  if (!picked) return;
  await bindNoticePushes(async () => {
    await saveNotice(db, {
      userId: picked.courierId,
      type: "order",
      textKey: "notifOrderOffer",
      params: { title: `№${picked.publicNo}`, orderId, shopId: picked.shopId, audience: "courier" },
      actorId: null,
    });
  });
}

/** Remember a courier who already had this order, so the cascade does not hand it straight back. */
export async function skipCourier(orderId: string, courierId: string): Promise<void> {
  const db = getDb();
  const past = await db
    .select({ id: orderOffers.id })
    .from(orderOffers)
    .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.courierId, courierId)))
    .limit(1);
  if (past[0]) return;
  await db
    .insert(orderOffers)
    .values({ orderId, courierId, expiresAt: new Date(), status: "declined" })
    .catch(() => undefined);
}

/** End every live offer on an order. Used when the order is cancelled or rejected. */
export async function expireOrderOffers(orderId: string): Promise<void> {
  await getDb()
    .update(orderOffers)
    .set({ status: "expired" })
    .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, "offered")));
}

/** A courier who goes offline, is paused, or is revoked must not keep a 45-second hold. */
export async function releaseCourierOffers(courierId: string): Promise<void> {
  const dropped = await getDb()
    .update(orderOffers)
    .set({ status: "expired" })
    .where(and(eq(orderOffers.courierId, courierId), eq(orderOffers.status, "offered")))
    .returning({ orderId: orderOffers.orderId });
  for (const row of dropped) {
    await skipCourier(row.orderId, courierId);
    await offerNext(row.orderId).catch(() => undefined);
  }
}

/** Expire offers that ran out of 45 seconds and offer the next courier. */
export async function sweepDispatch(): Promise<void> {
  const db = getDb();
  const expired = await db
    .update(orderOffers)
    .set({ status: "expired" })
    .where(and(eq(orderOffers.status, "offered"), lt(orderOffers.expiresAt, new Date())))
    .returning({ orderId: orderOffers.orderId });
  const ids = [...new Set(expired.map((row) => row.orderId))];
  for (const id of ids) {
    await offerNext(id).catch((err) => {
      console.error("dispatch", err instanceof Error ? err.message : "failed");
    });
  }
}

/** Orders with a live offer stay off the open board. */
export async function liveOfferedOrderIds(): Promise<Set<string>> {
  const rows = await getDb()
    .select({ orderId: orderOffers.orderId })
    .from(orderOffers)
    .where(and(eq(orderOffers.status, "offered"), gt(orderOffers.expiresAt, new Date())));
  return new Set(rows.map((row) => row.orderId));
}

export async function liveOfferFor(courierId: string): Promise<{ orderId: string; expiresAt: Date } | null> {
  const rows = await getDb()
    .select({ orderId: orderOffers.orderId, expiresAt: orderOffers.expiresAt })
    .from(orderOffers)
    .where(and(eq(orderOffers.courierId, courierId), eq(orderOffers.status, "offered"), gt(orderOffers.expiresAt, new Date())))
    .orderBy(asc(orderOffers.expiresAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function acceptOffer(orderId: string, courierId: string): Promise<boolean> {
  const rows = await getDb()
    .update(orderOffers)
    .set({ status: "accepted" })
    .where(
      and(
        eq(orderOffers.orderId, orderId),
        eq(orderOffers.courierId, courierId),
        eq(orderOffers.status, "offered"),
        gt(orderOffers.expiresAt, new Date()),
      ),
    )
    .returning({ id: orderOffers.id });
  return Boolean(rows[0]);
}

export async function declineOffer(orderId: string, courierId: string): Promise<boolean> {
  const rows = await getDb()
    .update(orderOffers)
    .set({ status: "declined" })
    .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.courierId, courierId), eq(orderOffers.status, "offered")))
    .returning({ id: orderOffers.id });
  return Boolean(rows[0]);
}

/** True when someone else still has the 45-second offer. */
export async function offerBlocks(orderId: string, courierId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ courierId: orderOffers.courierId })
    .from(orderOffers)
    .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, "offered"), gt(orderOffers.expiresAt, new Date())))
    .limit(1);
  if (!rows[0]) return false;
  return rows[0].courierId !== courierId;
}
