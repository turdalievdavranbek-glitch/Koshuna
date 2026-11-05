import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { isDbUserId } from "@/lib/phone";
import { getDb } from "./db";
import { orders, shops, users } from "./db/schema";
import { offerNext, skipCourier, sweepDispatch } from "./delivery-dispatch";
import { recordNoShow, reviewShop } from "./delivery-standing";
import { clearOrderTracks } from "./delivery-track";
import { bindNoticePushes, saveNotices, type NoticeWrite } from "./notices";

type Fail = { error: string; status: number };

function minutes(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw < 1 || raw > 24 * 60) return fallback;
  return Math.round(raw);
}

function ago(min: number): Date {
  return new Date(Date.now() - min * 60_000);
}

function note(
  userId: string,
  textKey: string,
  order: { id: string; publicNo: number; shopId: string },
  audience: "buyer" | "shop" | "courier",
): NoticeWrite {
  return {
    userId,
    type: "order",
    textKey,
    params: { title: `№${order.publicNo}`, orderId: order.id, shopId: order.shopId, audience },
    actorId: null,
  };
}

async function ownerOf(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await getDb().select({ id: shops.id, ownerId: shops.ownerId }).from(shops).where(inArray(shops.id, ids));
  return new Map(rows.map((row) => [row.id, row.ownerId]));
}

async function tellAdmins(order: { id: string; publicNo: number; shopId: string }, textKey: string): Promise<void> {
  const admins = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(20);
  if (!admins.length) return;
  await saveNotices(
    getDb(),
    admins.map((admin) => note(admin.id, textKey, order, "shop")),
  );
}

/** Timeouts for orders nobody is moving. Each update matches the old status, so a second run does not repeat it. */
export async function sweepDeliveryOrders(): Promise<void> {
  const db = getDb();
  await bindNoticePushes(async () => {
    const dropped = await db
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "shop-timeout" })
      .where(and(eq(orders.status, "new"), lt(orders.createdAt, ago(minutes("DELIVERY_ACCEPT_MINUTES", 20)))))
      .returning();
    if (dropped.length) {
      const owners = await ownerOf(dropped.map((row) => row.shopId));
      const notes: NoticeWrite[] = [];
      for (const order of dropped) {
        notes.push(note(order.buyerId, "notifOrderShopTimeout", order, "buyer"));
        const owner = owners.get(order.shopId);
        if (owner) notes.push(note(owner, "notifOrderShopTimeout", order, "shop"));
      }
      await saveNotices(db, notes);
      for (const order of dropped) await reviewShop(order.shopId).catch(() => undefined);
      await clearOrderTracks(dropped.map((order) => order.id)).catch(() => undefined);
    }

    const waiting = await db
      .update(orders)
      .set({ courierWaitNotifiedAt: new Date() })
      .where(
        and(
          eq(orders.status, "assembled"),
          isNotNull(orders.buyerConfirmedAt),
          isNull(orders.courierId),
          isNull(orders.courierWaitNotifiedAt),
          lt(orders.buyerConfirmedAt, ago(minutes("DELIVERY_COURIER_WAIT_MINUTES", 30))),
        ),
      )
      .returning();
    if (waiting.length) {
      const owners = await ownerOf(waiting.map((row) => row.shopId));
      const notes: NoticeWrite[] = [];
      for (const order of waiting) {
        notes.push(note(order.buyerId, "notifOrderNoCourier", order, "buyer"));
        const owner = owners.get(order.shopId);
        if (owner) notes.push(note(owner, "notifOrderNoCourier", order, "shop"));
      }
      await saveNotices(db, notes);
    }

    const pickupCutoff = ago(minutes("DELIVERY_PICKUP_MINUTES", 20));
    const released = await db.execute<{ id: string; courier_id: string | null; buyer_id: string; shop_id: string; public_no: number }>(sql`
      WITH due AS (
        SELECT id, courier_id FROM orders
        WHERE status = 'assigned' AND assigned_at < ${pickupCutoff}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE orders AS o
      SET status = 'assembled', courier_id = NULL, assigned_at = NULL
      FROM due
      WHERE o.id = due.id
      RETURNING o.id, due.courier_id, o.buyer_id, o.shop_id, o.public_no
    `);
    const releasedRows = [...released];
    if (releasedRows.length) {
      const owners = await ownerOf(releasedRows.map((row) => row.shop_id));
      const notes: NoticeWrite[] = [];
      for (const order of releasedRows) {
        const shaped = { id: order.id, publicNo: order.public_no, shopId: order.shop_id };
        notes.push(note(order.buyer_id, "notifOrderReleased", shaped, "buyer"));
        const owner = owners.get(order.shop_id);
        if (owner) notes.push(note(owner, "notifOrderReleased", shaped, "shop"));
        if (order.courier_id) notes.push(note(order.courier_id, "notifOrderReleased", shaped, "courier"));
      }
      await saveNotices(db, notes);
      for (const order of releasedRows) {
        if (order.courier_id) {
          await recordNoShow(order.courier_id, order.id).catch(() => undefined);
          await skipCourier(order.id, order.courier_id).catch(() => undefined);
        }
        await offerNext(order.id).catch(() => undefined);
      }
      await clearOrderTracks(releasedRows.map((order) => order.id)).catch(() => undefined);
    }

    const stale = await db
      .update(orders)
      .set({ adminFlag: "stale_pickup" })
      .where(and(eq(orders.status, "picked_up"), isNull(orders.adminFlag), lt(orders.pickedAt, ago(minutes("DELIVERY_DROPOFF_MINUTES", 90)))))
      .returning();
    for (const order of stale) await tellAdmins(order, "notifOrderStale");

    const gone = await db
      .select({ id: orders.id, courierId: orders.courierId, buyerId: orders.buyerId, shopId: orders.shopId, publicNo: orders.publicNo, status: orders.status })
      .from(orders)
      .innerJoin(users, eq(orders.courierId, users.id))
      .where(and(inArray(orders.status, ["assigned", "picked_up"]), or(eq(users.isCourier, false), isNotNull(users.bannedAt), isNotNull(users.deletedAt))));
    for (const order of gone) {
      if (order.status === "assigned") {
        const updated = await db
          .update(orders)
          .set({ status: "assembled", courierId: null, assignedAt: null })
          .where(and(eq(orders.id, order.id), eq(orders.status, "assigned"), eq(orders.courierId, order.courierId!)))
          .returning();
        if (!updated[0]) continue;
        const owners = await ownerOf([order.shopId]);
        const notes = [
          note(order.buyerId, "notifOrderReleased", order, "buyer"),
          note(order.courierId!, "notifOrderReleased", order, "courier"),
        ];
        const owner = owners.get(order.shopId);
        if (owner) notes.push(note(owner, "notifOrderReleased", order, "shop"));
        await saveNotices(db, notes);
        await skipCourier(order.id, order.courierId!).catch(() => undefined);
        await offerNext(order.id).catch(() => undefined);
        await clearOrderTracks([order.id]).catch(() => undefined);
        continue;
      }
      const flagged = await db
        .update(orders)
        .set({ adminFlag: "stale_pickup" })
        .where(and(eq(orders.id, order.id), eq(orders.status, "picked_up"), isNull(orders.adminFlag)))
        .returning();
      if (flagged[0]) await tellAdmins(flagged[0], "notifOrderStale");
    }
  });
}

const globalSweep = globalThis as { __koshunaSweep?: boolean; __koshunaSweepAt?: number };

function runSweep(): void {
  void sweepDeliveryOrders().catch((err) => {
    console.error("delivery-sweep", err instanceof Error ? err.message : "failed");
  });
}

/** pm2 runs one Node process. The first order read starts a minute timer. */
function ensureSweepTimer(): void {
  if (globalSweep.__koshunaSweep) return;
  globalSweep.__koshunaSweep = true;
  setInterval(() => {
    globalSweep.__koshunaSweepAt = Date.now();
    runSweep();
  }, 60_000);
  setInterval(() => {
    void sweepDispatch().catch((err) => {
      console.error("dispatch", err instanceof Error ? err.message : "failed");
    });
  }, 12_000);
}

/** At most one pass per 30s in this process. Reads of orders call this. */
export function kickDeliverySweep(): void {
  ensureSweepTimer();
  const now = Date.now();
  if ((globalSweep.__koshunaSweepAt ?? 0) + 30_000 > now) return;
  globalSweep.__koshunaSweepAt = now;
  runSweep();
}

export type StuckOrder = { id: string; no: number; status: string; flag: string | null; codeFails: number; shopName: string; createdAt: string };

export async function listStuckOrders(): Promise<StuckOrder[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      no: orders.publicNo,
      status: orders.status,
      flag: orders.adminFlag,
      codeFails: orders.codeFails,
      shopName: shops.name,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(or(isNotNull(orders.adminFlag), and(eq(orders.status, "picked_up"), sql`${orders.codeFails} >= 5`)))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function resolveStuck(orderId: string, action: "unlock" | "clear"): Promise<{ ok: true } | Fail> {
  if (!isDbUserId(orderId)) return { error: "not-found", status: 404 };
  const db = getDb();
  if (action === "unlock") {
    const rows = await db
      .update(orders)
      .set({ codeFails: 0, adminFlag: sql`case when ${orders.adminFlag} = 'code_locked' then null else ${orders.adminFlag} end` })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });
    if (!rows[0]) return { error: "not-found", status: 404 };
    return { ok: true };
  }
  const rows = await db.update(orders).set({ adminFlag: null }).where(eq(orders.id, orderId)).returning({ id: orders.id });
  if (!rows[0]) return { error: "not-found", status: 404 };
  return { ok: true };
}
