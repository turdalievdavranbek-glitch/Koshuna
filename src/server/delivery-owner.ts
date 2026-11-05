import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { isShopId } from "@/lib/delivery";
import { isDbUserId } from "@/lib/phone";
import { getDb } from "./db";
import { deliveryDisputes, orders, shops, users } from "./db/schema";

type Fail = { error: string; status: number };

export async function ownerDeliveryDesk() {
  const db = getDb();
  const now = new Date();
  const couriers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      until: users.courierPausedUntil,
      pauses: users.courierPauseCount,
      soft: users.courierSoftBanned,
    })
    .from(users)
    .where(or(eq(users.courierSoftBanned, true), gt(users.courierPausedUntil, now)))
    .orderBy(desc(users.updatedAt))
    .limit(100);
  const points = await db
    .select({ id: shops.id, name: shops.name })
    .from(shops)
    .where(eq(shops.deliveryEnabled, false))
    .orderBy(desc(shops.updatedAt))
    .limit(100);
  const disputes = await db
    .select({
      id: deliveryDisputes.id,
      text: deliveryDisputes.text,
      createdAt: deliveryDisputes.createdAt,
      no: orders.publicNo,
      hasPhoto: sql<boolean>`${deliveryDisputes.photoPath} is not null`,
    })
    .from(deliveryDisputes)
    .innerJoin(orders, eq(orders.id, deliveryDisputes.orderId))
    .where(eq(deliveryDisputes.status, "escalated"))
    .orderBy(desc(deliveryDisputes.createdAt))
    .limit(50);
  return {
    couriers: couriers.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      until: row.until ? row.until.toISOString() : null,
      pauses: row.pauses,
      soft: row.soft,
    })),
    shops: points,
    disputes: disputes.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
}

export async function ownerDeliveryAct(action: string, id: string): Promise<{ ok: true } | Fail> {
  const db = getDb();
  if (action === "restore-courier") {
    if (!isDbUserId(id)) return { error: "not-found", status: 404 };
    await db
      .update(users)
      .set({ courierSoftBanned: false, courierPauseCount: 0, courierPausedUntil: null, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    return { ok: true };
  }
  if (action === "restore-shop") {
    if (!isShopId(id)) return { error: "not-found", status: 404 };
    await db.update(shops).set({ deliveryEnabled: true, updatedAt: new Date() }).where(eq(shops.id, id));
    return { ok: true };
  }
  if (action === "close-dispute") {
    if (!isDbUserId(id)) return { error: "not-found", status: 404 };
    await db.update(deliveryDisputes).set({ status: "closed", resolution: "Закрыл владелец" }).where(eq(deliveryDisputes.id, id));
    return { ok: true };
  }
  return { error: "bad-action", status: 400 };
}

export async function ownerDisputePhoto(id: string): Promise<string | null> {
  if (!isDbUserId(id)) return null;
  const rows = await getDb().select({ path: deliveryDisputes.photoPath }).from(deliveryDisputes).where(eq(deliveryDisputes.id, id)).limit(1);
  return rows[0]?.path ?? null;
}
