import { and, eq, ne, sql } from "drizzle-orm";
import type { ShopItemStats, ShopStatsCard, ShopStatsPeriod } from "@/lib/shop-stats-types";
import type { ShopProduct } from "@/lib/types";
import { isOwnerEmail } from "@/lib/owner";
import { getDb } from "./db";
import { shops, users } from "./db/schema";
import { rowToShop } from "./mappers";

const ZONE = "Asia/Bishkek";
const DEVICE = /^[A-Za-z0-9-]{8,64}$/;

export type { ShopItemStats, ShopStatsCard, ShopStatsPeriod } from "@/lib/shop-stats-types";

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function spanOf(period: ShopStatsPeriod): number {
  if (period === "week") return 6;
  if (period === "month") return 29;
  return 0;
}

function viewerKey(userId: string | null, device: unknown): string | null {
  if (userId) return `u:${userId}`;
  if (typeof device === "string" && DEVICE.test(device)) return `d:${device}`;
  return null;
}

export async function recordShopEvent(
  shopId: string,
  kind: "shop_view" | "call" | "whatsapp",
  viewer: { userId: string | null; device: unknown },
): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  const rows = await db
    .select({ ownerId: shops.ownerId, status: shops.status })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);
  const shop = rows[0];
  if (!shop || shop.status === "hidden") return { error: "not-found", status: 404 };
  if (viewer.userId && viewer.userId === shop.ownerId) return { ok: true };
  const key = viewerKey(viewer.userId, viewer.device);
  if (!key) return { ok: true };
  await db.execute(sql`
    INSERT INTO shop_events (shop_id, kind, viewer_key, day)
    VALUES (${shopId}, ${kind}, ${key}, (now() AT TIME ZONE ${ZONE})::date)
    ON CONFLICT DO NOTHING
  `);
  return { ok: true };
}

async function allowedShopIds(userId: string): Promise<string[]> {
  const db = getDb();
  const who = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const owner = isOwnerEmail(who[0]?.email);
  const rows = await db
    .select({ id: shops.id })
    .from(shops)
    .where(owner ? ne(shops.status, "hidden") : and(eq(shops.ownerId, userId), ne(shops.status, "hidden")));
  return rows.map((row) => row.id);
}

type Bag = {
  views: number;
  calls: number;
  whatsapp: number;
  itemViews: number;
  chats: number;
  subscribers: number;
  likes: number;
  orders: number;
  ordersSom: number;
  refused: number;
  ordersOpened: number;
  replySeconds: number | null;
  replyN: number;
  itemViewsBy: Map<string, number>;
  soldBy: Map<string, { qty: number; som: number }>;
};

function emptyBag(): Bag {
  return {
    views: 0,
    calls: 0,
    whatsapp: 0,
    itemViews: 0,
    chats: 0,
    subscribers: 0,
    likes: 0,
    orders: 0,
    ordersSom: 0,
    refused: 0,
    ordersOpened: 0,
    replySeconds: null,
    replyN: 0,
    itemViewsBy: new Map(),
    soldBy: new Map(),
  };
}

export async function shopStatsFor(userId: string, period: ShopStatsPeriod): Promise<ShopStatsCard[]> {
  const ids = await allowedShopIds(userId);
  if (!ids.length) return [];
  const db = getDb();
  const span = spanOf(period);
  const from = sql`(now() AT TIME ZONE ${ZONE})::date - ${span}`;
  const inShops = sql`shop_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
  const [eventRows, viewRows, chatRows, subRows, likeRows, orderRows, soldRows, replyRows, shopRows] = await Promise.all([
    db.execute<{ shop_id: string; kind: string; n: number }>(sql`
      SELECT shop_id, kind, count(*)::int AS n
      FROM shop_events
      WHERE ${inShops} AND day >= ${from}
      GROUP BY shop_id, kind
    `),
    db.execute<{ shop_id: string; product_id: string | null; n: number }>(sql`
      SELECT l.shop_id, l.shop_product_id AS product_id, count(*)::int AS n
      FROM listing_views v
      JOIN listings l ON l.id = v.listing_id
      WHERE l.shop_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
        AND v.day >= ${from}
      GROUP BY l.shop_id, l.shop_product_id
    `),
    db.execute<{ shop_id: string; n: number }>(sql`
      SELECT coalesce(t.shop_id, l.shop_id) AS shop_id, count(DISTINCT t.id)::int AS n
      FROM threads t
      LEFT JOIN listings l ON l.id = t.listing_id
      WHERE coalesce(t.shop_id, l.shop_id) in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
        AND (t.created_at AT TIME ZONE ${ZONE})::date >= ${from}
      GROUP BY 1
    `),
    db.execute<{ shop_id: string; n: number }>(sql`
      SELECT shop_id, count(*)::int AS n
      FROM subscriptions
      WHERE ${inShops} AND (created_at AT TIME ZONE ${ZONE})::date >= ${from}
      GROUP BY shop_id
    `),
    db.execute<{ shop_id: string; n: number }>(sql`
      SELECT l.shop_id, count(*)::int AS n
      FROM reactions r
      JOIN listings l ON l.id = r.listing_id
      WHERE l.shop_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
        AND r.value = 'like'
        AND (r.updated_at AT TIME ZONE ${ZONE})::date >= ${from}
      GROUP BY l.shop_id
    `),
    db.execute<{ shop_id: string; delivered: number; som: number; opened: number; refused: number }>(sql`
      SELECT shop_id,
        count(*) FILTER (WHERE status = 'delivered' AND (delivered_at AT TIME ZONE ${ZONE})::date >= ${from})::int AS delivered,
        coalesce(sum(total_som) FILTER (WHERE status = 'delivered' AND (delivered_at AT TIME ZONE ${ZONE})::date >= ${from}), 0)::int AS som,
        count(*) FILTER (WHERE (created_at AT TIME ZONE ${ZONE})::date >= ${from})::int AS opened,
        count(*) FILTER (WHERE status = 'rejected' AND (created_at AT TIME ZONE ${ZONE})::date >= ${from})::int AS refused
      FROM orders
      WHERE ${inShops}
      GROUP BY shop_id
    `),
    db.execute<{ shop_id: string; product_id: string; qty: number; som: number }>(sql`
      SELECT o.shop_id, i.product_id, coalesce(sum(i.qty), 0)::int AS qty, coalesce(sum(i.qty * i.price_som_snapshot), 0)::int AS som
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      WHERE o.shop_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
        AND o.status = 'delivered'
        AND (o.delivered_at AT TIME ZONE ${ZONE})::date >= ${from}
      GROUP BY o.shop_id, i.product_id
    `),
    db.execute<{ shop_id: string; seconds: number; n: number }>(sql`
      SELECT shop_id, coalesce(avg(seconds), 0)::float AS seconds, count(*)::int AS n
      FROM (
        SELECT coalesce(t.shop_id, l.shop_id) AS shop_id,
          extract(epoch FROM (
            min(m.created_at) FILTER (WHERE m.sender_id = t.seller_id AND m.deleted_at IS NULL AND m.kind <> 'system')
            - min(m.created_at) FILTER (WHERE m.sender_id = t.buyer_id AND m.deleted_at IS NULL AND m.kind <> 'system')
          )) AS seconds
        FROM threads t
        LEFT JOIN listings l ON l.id = t.listing_id
        JOIN messages m ON m.thread_id = t.id
        WHERE coalesce(t.shop_id, l.shop_id) in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
          AND (t.created_at AT TIME ZONE ${ZONE})::date >= ${from}
        GROUP BY t.id, t.seller_id, t.buyer_id, coalesce(t.shop_id, l.shop_id)
      ) replies
      WHERE seconds IS NOT NULL AND seconds >= 0
      GROUP BY shop_id
    `),
    db.select().from(shops).where(sql`${shops.id} in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`),
  ]);

  const bags = new Map<string, Bag>(ids.map((id) => [id, emptyBag()]));
  const take = <T extends { shop_id: string }>(result: unknown): T[] => {
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === "object" && Array.isArray((result as { rows?: T[] }).rows)) return (result as { rows: T[] }).rows;
    return [];
  };
  for (const row of take<{ shop_id: string; kind: string; n: number }>(eventRows)) {
    const bag = bags.get(row.shop_id);
    if (!bag) continue;
    if (row.kind === "shop_view") bag.views = num(row.n);
    if (row.kind === "call") bag.calls = num(row.n);
    if (row.kind === "whatsapp") bag.whatsapp = num(row.n);
  }
  for (const row of take<{ shop_id: string; product_id: string | null; n: number }>(viewRows)) {
    const bag = bags.get(row.shop_id);
    if (!bag) continue;
    bag.itemViews += num(row.n);
    if (row.product_id) bag.itemViewsBy.set(row.product_id, num(row.n));
  }
  for (const row of take<{ shop_id: string; n: number }>(chatRows)) {
    const bag = bags.get(row.shop_id);
    if (bag) bag.chats = num(row.n);
  }
  for (const row of take<{ shop_id: string; n: number }>(subRows)) {
    const bag = bags.get(row.shop_id);
    if (bag) bag.subscribers = num(row.n);
  }
  for (const row of take<{ shop_id: string; n: number }>(likeRows)) {
    const bag = bags.get(row.shop_id);
    if (bag) bag.likes = num(row.n);
  }
  for (const row of take<{ shop_id: string; delivered: number; som: number; opened: number; refused: number }>(orderRows)) {
    const bag = bags.get(row.shop_id);
    if (!bag) continue;
    bag.orders = num(row.delivered);
    bag.ordersSom = num(row.som);
    bag.ordersOpened = num(row.opened);
    bag.refused = num(row.refused);
  }
  for (const row of take<{ shop_id: string; product_id: string; qty: number; som: number }>(soldRows)) {
    bags.get(row.shop_id)?.soldBy.set(row.product_id, { qty: num(row.qty), som: num(row.som) });
  }
  for (const row of take<{ shop_id: string; seconds: number; n: number }>(replyRows)) {
    const bag = bags.get(row.shop_id);
    if (!bag || num(row.n) <= 0) continue;
    bag.replySeconds = num(row.seconds);
    bag.replyN = num(row.n);
  }

  const cards: ShopStatsCard[] = [];
  for (const row of shopRows) {
    const shop = rowToShop(row);
    const bag = bags.get(shop.id) ?? emptyBag();
    const items: ShopItemStats[] = [];
    let stockValueSom = 0;
    for (const product of (shop.products ?? []).filter((item) => item.published !== false)) {
      const line = itemLine(product, bag);
      items.push(line);
      if (line.stockValueSom != null) stockValueSom += line.stockValueSom;
    }
    items.sort((a, b) => b.views - a.views || a.title.localeCompare(b.title, "ru"));
    cards.push({
      id: shop.id,
      name: shop.name || shop.id,
      views: bag.views,
      itemViews: bag.itemViews,
      calls: bag.calls,
      whatsapp: bag.whatsapp,
      chats: bag.chats,
      subscribers: bag.subscribers,
      likes: bag.likes,
      orders: bag.orders,
      ordersSom: bag.ordersSom,
      stockValueSom,
      replyMinutes: bag.replyN > 0 && bag.replySeconds != null ? Math.round(bag.replySeconds / 60) : null,
      refused: bag.refused,
      ordersOpened: bag.ordersOpened,
      items,
    });
  }
  cards.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return cards;
}

function itemLine(product: ShopProduct, bag: Bag): ShopItemStats {
  const sold = bag.soldBy.get(product.id);
  const quantity = typeof product.quantity === "number" ? product.quantity : null;
  const price = typeof product.price === "number" ? product.price : null;
  const stockValueSom = quantity != null && price != null ? quantity * price : null;
  return {
    id: product.id,
    title: product.title,
    views: bag.itemViewsBy.get(product.id) ?? 0,
    sold: sold?.qty ?? 0,
    quantity,
    revenueSom: sold?.som ?? 0,
    stockValueSom,
    low: quantity != null && quantity <= 2,
  };
}
