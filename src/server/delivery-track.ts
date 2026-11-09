import { eq, inArray } from "drizzle-orm";
import { haversineKm } from "@/lib/geo";
import { getDb } from "./db";
import { courierApplications, orderTracks, orders, shops, users } from "./db/schema";

type Fail = { error: string; status: number };
const ROAD = 1.3;

export type TrackView = {
  closed: boolean;
  courier: { lat: number; lng: number } | null;
  shop: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  /** "25" or "30–45". The client wraps it in the sentence. */
  eta: string;
};

function speedKmh(transport: string | null): number {
  if (transport === "walk") return 5;
  if (transport === "moto" || transport === "car") return 25;
  return 15;
}

function round5(mins: number): number {
  return Math.max(5, Math.round(mins / 5) * 5);
}

function finitePoint(lat: number | null | undefined, lng: number | null | undefined): { lat: number; lng: number } | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Road minutes. Null when there is no distance to go on. */
export function etaSpan(input: {
  courier: { lat: number; lng: number } | null;
  shop: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  distanceKm: number | null;
  speed: number;
  pickedUp: boolean;
}): string {
  let km: number | null = null;
  if (!input.pickedUp && input.courier && input.shop) {
    km = haversineKm(input.courier.lat, input.courier.lng, input.shop.lat, input.shop.lng);
    if (input.dropoff) km += haversineKm(input.shop.lat, input.shop.lng, input.dropoff.lat, input.dropoff.lng);
    else if (input.distanceKm != null && input.distanceKm > 0) km += input.distanceKm;
  } else if (input.pickedUp && input.courier && input.dropoff) {
    km = haversineKm(input.courier.lat, input.courier.lng, input.dropoff.lat, input.dropoff.lng);
  } else if (input.distanceKm != null && input.distanceKm > 0) {
    km = input.distanceKm;
  }
  if (km == null) return "30–45";
  return String(round5((km * ROAD / input.speed) * 60 + (input.pickedUp ? 0 : 5)));
}

async function loadEta(orderId: string, courierId: string | null, pickedUp: boolean, courierPoint: { lat: number; lng: number } | null): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({
      lat: orders.lat,
      lng: orders.lng,
      distanceKm: orders.distanceKm,
      shopLat: shops.lat,
      shopLng: shops.lng,
    })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return "30–45";
  let speed = 15;
  if (courierId) {
    const app = await db
      .select({ transport: courierApplications.transport })
      .from(courierApplications)
      .where(eq(courierApplications.userId, courierId))
      .limit(1);
    speed = speedKmh(app[0]?.transport ?? null);
  }
  return etaSpan({
    courier: courierPoint,
    shop: finitePoint(row.shopLat, row.shopLng),
    dropoff: finitePoint(row.lat, row.lng),
    distanceKm: row.distanceKm,
    speed,
    pickedUp,
  });
}

export async function etaSpanForCourier(orderId: string, courierId: string, pickedUp: boolean): Promise<string> {
  const who = await getDb()
    .select({ lat: users.lastLat, lng: users.lastLng })
    .from(users)
    .where(eq(users.id, courierId))
    .limit(1);
  const fix = await getDb().select().from(orderTracks).where(eq(orderTracks.orderId, orderId)).limit(1);
  const point = finitePoint(fix[0]?.lat, fix[0]?.lng) ?? finitePoint(who[0]?.lat, who[0]?.lng);
  return loadEta(orderId, courierId, pickedUp, point);
}

export async function saveOrderTrack(userId: string, orderId: string, lat: number, lng: number): Promise<{ ok: true } | Fail> {
  const point = finitePoint(lat, lng);
  if (!point) return { error: "bad-point", status: 400 };
  const db = getDb();
  const rows = await db
    .select({ courierId: orders.courierId, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = rows[0];
  if (!order || order.courierId !== userId) return { error: "forbidden", status: 403 };
  if (order.status !== "assigned" && order.status !== "picked_up") return { error: "state", status: 409 };
  await db
    .insert(orderTracks)
    .values({ orderId, lat: point.lat, lng: point.lng, updatedAt: new Date() })
    .onConflictDoUpdate({ target: orderTracks.orderId, set: { lat: point.lat, lng: point.lng, updatedAt: new Date() } });
  return { ok: true };
}

export async function readOrderTrack(userId: string, orderId: string): Promise<TrackView | Fail> {
  const db = getDb();
  const rows = await db
    .select({
      buyerId: orders.buyerId,
      courierId: orders.courierId,
      status: orders.status,
      ownerId: shops.ownerId,
      lat: orders.lat,
      lng: orders.lng,
      shopLat: shops.lat,
      shopLng: shops.lng,
    })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "not-found", status: 404 };
  if (row.buyerId !== userId && row.ownerId !== userId) return { error: "not-found", status: 404 };
  const live = row.status === "assigned" || row.status === "picked_up";
  if (!live) {
    await clearOrderTrack(orderId);
    return {
      closed: true,
      courier: null,
      shop: null,
      dropoff: null,
      eta: "30–45",
    };
  }
  const fix = await db.select().from(orderTracks).where(eq(orderTracks.orderId, orderId)).limit(1);
  const courier = finitePoint(fix[0]?.lat, fix[0]?.lng);
  return {
    closed: false,
    courier,
    shop: finitePoint(row.shopLat, row.shopLng),
    dropoff: finitePoint(row.lat, row.lng),
    eta: await loadEta(orderId, row.courierId, row.status === "picked_up", courier),
  };
}

export async function clearOrderTrack(orderId: string): Promise<void> {
  await getDb().delete(orderTracks).where(eq(orderTracks.orderId, orderId));
}

export async function clearOrderTracks(orderIds: string[]): Promise<void> {
  if (!orderIds.length) return;
  await getDb().delete(orderTracks).where(inArray(orderTracks.orderId, orderIds));
}
