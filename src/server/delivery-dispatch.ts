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
  const rows = await db
    .select({ order: orders, shop: shops })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  if (row.order.status !== "assembled" || !row.order.buyerConfirmedAt || row.order.courierId) return;

  const live = await db
    .select({ id: orderOffers.id })
    .from(orderOffers)
    .where(and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, "offered"), gt(orderOffers.expiresAt, new Date())))
    .limit(1);
  if (live[0]) return;

  const past = await db.select({ courierId: orderOffers.courierId }).from(orderOffers).where(eq(orderOffers.orderId, orderId));
  const asked = new Set(past.map((item) => item.courierId));
  const couriers = await db
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
        row.shop.city ? eq(users.courierCity, row.shop.city) : sql`true`,
      ),
    )
    .limit(200);

  const busy = await db
    .select({ courierId: orders.courierId })
    .from(orders)
    .where(and(isNotNull(orders.courierId), inArray(orders.status, ["assigned", "picked_up", "refused"])));
  const held = new Set(busy.map((item) => item.courierId).filter((id): id is string => Boolean(id)));
  const radius = radiusKm();
  const ranked = couriers
    .filter((courier) => {
      if (asked.has(courier.id) || held.has(courier.id)) return false;
      if (courier.id === row.order.buyerId || courier.id === row.shop.ownerId) return false;
      if (paused({ courierSoftBanned: courier.soft, courierPausedUntil: courier.pausedUntil })) return false;
      if (row.shop.lat == null || row.shop.lng == null || courier.lat == null || courier.lng == null) return true;
      return haversineKm(courier.lat, courier.lng, row.shop.lat, row.shop.lng) <= radius;
    })
    .map((courier) => ({
      id: courier.id,
      km:
        row.shop.lat != null && row.shop.lng != null && courier.lat != null && courier.lng != null
          ? haversineKm(courier.lat, courier.lng, row.shop.lat, row.shop.lng)
          : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.km - b.km);

  const next = ranked[0];
  if (!next) return;
  const expiresAt = new Date(Date.now() + OFFER_MS);
  try {
    await db.insert(orderOffers).values({ orderId, courierId: next.id, expiresAt, status: "offered" });
  } catch {
    return;
  }
  await bindNoticePushes(async () => {
    await saveNotice(db, {
      userId: next.id,
      type: "order",
      textKey: "notifOrderOffer",
      params: { title: `№${row.order.publicNo}`, orderId, shopId: row.order.shopId, audience: "courier" },
      actorId: null,
    });
  });
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
