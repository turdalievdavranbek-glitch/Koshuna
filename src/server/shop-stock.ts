import { eq } from "drizzle-orm";
import type { Shop, ShopProduct } from "@/lib/types";
import { type Db } from "./db";
import { orderItems, orders, shops } from "./db/schema";
import { rowToShop } from "./mappers";
import { saveNotices, type NoticeWrite } from "./notices";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Titles that just fell to 2 or fewer units. */
export function newlyLowTitles(before: ShopProduct[], after: ShopProduct[]): string[] {
  const prev = new Map(before.map((item) => [item.id, item.quantity]));
  const titles: string[] = [];
  for (const item of after) {
    if (typeof item.quantity !== "number" || item.quantity > 2) continue;
    const was = prev.get(item.id);
    if (typeof was !== "number" || was > 2) titles.push(item.title);
  }
  return titles;
}

export async function notifyLowStock(db: Db | Tx, ownerId: string, shopId: string, titles: string[]) {
  if (!titles.length) return;
  const notes: NoticeWrite[] = titles.map((title) => ({
    userId: ownerId,
    type: "shop",
    textKey: "notifStockLow",
    params: { title, shopId, audience: "shop" },
    actorId: null,
  }));
  await saveNotices(db, notes);
}

/** Reduce on-hand quantity once, when a delivery is completed. */
export async function applyDeliveredStock(tx: Tx, orderId: string, shopId: string, ownerId: string) {
  const [flag] = await tx.select({ applied: orders.stockApplied }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!flag || flag.applied) return;
  const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const sold = new Map<string, number>();
  for (const line of lines) sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.qty);
  const [row] = await tx.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!row) return;
  const shop = rowToShop(row);
  const before = shop.products ?? [];
  const products = before.map((item) => {
    const take = sold.get(item.id);
    if (!take || typeof item.quantity !== "number") return item;
    const quantity = Math.max(0, item.quantity - take);
    return {
      ...item,
      quantity,
      stock: quantity === 0 ? ("out" as const) : item.stock,
      updatedAt: new Date().toISOString(),
    };
  });
  const next: Shop = { ...shop, products, updatedAt: new Date().toISOString() };
  await tx.update(shops).set({ doc: next, updatedAt: new Date() }).where(eq(shops.id, shopId));
  await tx.update(orders).set({ stockApplied: true }).where(eq(orders.id, orderId));
  await notifyLowStock(tx, ownerId, shopId, newlyLowTitles(before, products));
}

/** A save that sets quantity to 2 or fewer tells the shop once. */
export async function notifyLowStockOnSave(db: Db | Tx, ownerId: string, shopId: string, before: ShopProduct[], after: ShopProduct[]) {
  await notifyLowStock(db, ownerId, shopId, newlyLowTitles(before, after));
}
