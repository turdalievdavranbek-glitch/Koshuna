import { and, eq, isNull, sql } from "drizzle-orm";
import { OWNER_EMAIL } from "@/lib/owner";
import { getDb } from "./db";
import { deliveryDisputes, orders, shops, users } from "./db/schema";
import { photoMaxBytes, sniffImage, writeScopedPhoto } from "./courier-files";
import { bindNoticePushes, saveNotice } from "./notices";

type Fail = { error: string; status: number };

function autoResolution(order: { status: string; pickedAt: Date | null; receiptPath: string | null }): string | null {
  if (order.status === "delivered" && order.receiptPath) return "Доставлено: код принят и чек есть";
  if (order.status === "cancelled" && !order.pickedAt) return "Отмена до выдачи заказа";
  return null;
}

export async function openDispute(userId: string, orderId: string, text: string, photo: Buffer | null): Promise<{ ok: true; status: string } | Fail> {
  const body = text.trim();
  if (body.length < 4 || body.length > 1000) return { error: "bad-text", status: 400 };
  const db = getDb();
  const rows = await db
    .select({ order: orders, ownerId: shops.ownerId })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "not-found", status: 404 };
  const party = row.order.buyerId === userId || row.ownerId === userId || row.order.courierId === userId;
  if (!party) return { error: "forbidden", status: 403 };

  let photoPath: string | null = null;
  if (photo) {
    if (photo.length > photoMaxBytes()) return { error: "bad-photo", status: 400 };
    const ext = sniffImage(photo);
    if (!ext) return { error: "bad-photo", status: 400 };
    photoPath = await writeScopedPhoto("disputes", orderId, photo, ext);
  }
  const resolution = autoResolution(row.order);
  const status = resolution ? "auto" : "escalated";
  await db.insert(deliveryDisputes).values({
    orderId,
    openerId: userId,
    text: body,
    photoPath,
    status,
    resolution,
  });
  if (status === "escalated") {
    const owners = await db
      .select({ id: users.id })
      .from(users)
      .where(and(sql`lower(${users.email}) = ${OWNER_EMAIL}`, isNull(users.deletedAt)));
    await bindNoticePushes(async () => {
      for (const owner of owners) {
        await saveNotice(db, {
          userId: owner.id,
          type: "order",
          textKey: "notifDispute",
          params: { title: `№${row.order.publicNo}`, orderId, shopId: row.order.shopId, audience: "shop" },
          actorId: userId,
        });
      }
    });
  }
  return { ok: true, status };
}
