import { randomInt, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { haversineKm, inKonshuZone } from "@/lib/geo";
import { isOrderStatus, isProductId, isShopId, type CartShop, type CourierOffer, type FeeQuote, type OrderRole, type OrderStatus, type OrderView } from "@/lib/delivery";
import { isDbUserId, normalizePhoneInput } from "@/lib/phone";
import { shopCallPhone, shopDistrictName, shopLandmarkLine } from "@/lib/shops";
import type { Lang, Shop, ShopProduct } from "@/lib/types";
import { getDb } from "./db";
import { deliveryCart, orderItems, orders, shops, users } from "./db/schema";
import { rowToShop } from "./mappers";
import { bindNoticePushes, saveNotices, type NoticeWrite } from "./notices";

type Fail = { error: string; status: number };
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

const CODE_FAIL_CAP = 8;
const MAX_LINES = 30;

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw < 0 || raw > 100_000) return fallback;
  return Math.round(raw);
}

export function deliveryRates(): { baseSom: number; perKmSom: number; flatSom: number } {
  const baseSom = envInt("DELIVERY_BASE_SOM", 80);
  const perKmSom = envInt("DELIVERY_PER_KM_SOM", 15);
  return { baseSom, perKmSom, flatSom: envInt("DELIVERY_FLAT_SOM", baseSom) };
}

/** Base + per km when both points are in the Коңшу zone. Otherwise the flat fee. */
export function quoteFee(km: number | null): FeeQuote {
  const { baseSom, perKmSom, flatSom } = deliveryRates();
  if (km == null) return { feeSom: flatSom, km: null, flat: true, baseSom, perKmSom };
  return {
    feeSom: Math.max(0, Math.round(baseSom + perKmSom * km)),
    km: Math.round(km * 10) / 10,
    flat: false,
    baseSom,
    perKmSom,
  };
}

export function routeKm(
  shopLat: number | null | undefined,
  shopLng: number | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): number | null {
  if (shopLat == null || shopLng == null || lat == null || lng == null) return null;
  if (![shopLat, shopLng, lat, lng].every((n) => Number.isFinite(n))) return null;
  if (!inKonshuZone(lat, lng) || !inKonshuZone(shopLat, shopLng)) return null;
  return haversineKm(shopLat, shopLng, lat, lng);
}

function newCode(): string {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

function sameCode(stored: string, given: string): boolean {
  const left = Buffer.from(stored);
  const right = Buffer.from(given);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function uniqueViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if ("code" in cur && (cur as { code?: unknown }).code === "23505") return true;
    cur = "cause" in cur ? (cur as { cause?: unknown }).cause : null;
  }
  return false;
}

function shopPlace(shop: Shop, lang: Lang): string {
  return [shopDistrictName(shop.district, lang), shopLandmarkLine(shop)].filter(Boolean).join(" · ");
}

function sellable(product: ShopProduct): { priceSom: number } | null {
  if (product.published === false) return null;
  if (product.stock === "out") return null;
  if (product.quantity === 0) return null;
  if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0) return null;
  return { priceSom: Math.round(product.price) };
}

function note(
  userId: string,
  textKey: string,
  order: { id: string; publicNo: number; shopId: string },
  audience: "buyer" | "shop" | "courier",
  actorId: string | null,
): NoticeWrite {
  return {
    userId,
    type: "order",
    textKey,
    params: { title: `№${order.publicNo}`, orderId: order.id, shopId: order.shopId, audience },
    actorId,
  };
}

type Joined = {
  order: typeof orders.$inferSelect;
  shop: Shop;
  ownerId: string;
  buyerName: string;
};

async function loadJoined(db: Tx | ReturnType<typeof getDb>, ids: string[]): Promise<Joined[]> {
  if (!ids.length) return [];
  const rows = await db
    .select({ order: orders, shop: shops, buyerName: users.name })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(inArray(orders.id, ids));
  return rows.map((row) => ({
    order: row.order,
    shop: rowToShop(row.shop),
    ownerId: row.shop.ownerId,
    buyerName: row.buyerName,
  }));
}

function showCode(status: OrderStatus): boolean {
  return status === "new" || status === "accepted" || status === "assembled" || status === "assigned" || status === "picked_up";
}

async function toViews(db: Tx | ReturnType<typeof getDb>, joined: Joined[], role: OrderRole, lang: Lang): Promise<OrderView[]> {
  if (!joined.length) return [];
  const ids = joined.map((row) => row.order.id);
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.id));
  const byOrder = new Map<string, OrderView["items"]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push({
      id: item.id,
      productId: item.productId,
      title: item.titleSnapshot,
      priceSom: item.priceSomSnapshot,
      qty: item.qty,
    });
    byOrder.set(item.orderId, list);
  }
  return joined.map((row) => {
    const status = isOrderStatus(row.order.status) ? row.order.status : "new";
    const buyer = role === "buyer";
    const activeCourier = role === "courier" && (status === "assigned" || status === "picked_up" || status === "refused");
    return {
      id: row.order.id,
      no: row.order.publicNo,
      status,
      role,
      shopId: row.order.shopId,
      shopName: row.shop.name,
      shopPlace: shopPlace(row.shop, lang),
      shopPhone: buyer || activeCourier ? shopCallPhone(row.shop) || null : null,
      buyerName: row.buyerName,
      buyerPhone: role === "shop" || activeCourier ? row.order.phone : null,
      address: row.order.addressText,
      comment: row.order.comment,
      items: byOrder.get(row.order.id) ?? [],
      itemsTotalSom: row.order.itemsTotalSom,
      deliveryFeeSom: row.order.deliveryFeeSom,
      totalSom: row.order.totalSom,
      km: row.order.distanceKm == null ? null : Math.round(row.order.distanceKm * 10) / 10,
      flatFee: row.order.feeFlat,
      buyerConfirmed: row.order.buyerConfirmedAt != null,
      shopPaid: row.order.shopPaidAt != null,
      deliveryCode: buyer && showCode(status) ? row.order.deliveryCode : null,
      createdAt: row.order.createdAt.toISOString(),
    };
  });
}

export async function listBuyerOrders(userId: string, lang: Lang): Promise<OrderView[]> {
  const db = getDb();
  const ids = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.buyerId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(40);
  const joined = await loadJoined(db, ids.map((row) => row.id));
  joined.sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime());
  return toViews(db, joined, "buyer", lang);
}

export async function listShopOrders(userId: string, shopId: string, lang: Lang): Promise<OrderView[] | Fail> {
  if (!isShopId(shopId)) return { error: "bad-shop", status: 400 };
  const db = getDb();
  const shop = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop[0]) return { error: "not-found", status: 404 };
  if (shop[0].ownerId !== userId) return { error: "forbidden", status: 403 };
  const ids = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.shopId, shopId))
    .orderBy(desc(orders.createdAt))
    .limit(40);
  const joined = await loadJoined(db, ids.map((row) => row.id));
  joined.sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime());
  return toViews(db, joined, "shop", lang);
}

export async function getOrder(userId: string, orderId: string, lang: Lang): Promise<OrderView | Fail> {
  if (!isDbUserId(orderId)) return { error: "not-found", status: 404 };
  const db = getDb();
  const joined = await loadJoined(db, [orderId]);
  const row = joined[0];
  if (!row) return { error: "not-found", status: 404 };
  const role: OrderRole | null =
    row.order.buyerId === userId ? "buyer" : row.ownerId === userId ? "shop" : row.order.courierId === userId ? "courier" : null;
  if (!role) return { error: "not-found", status: 404 };
  const views = await toViews(db, [row], role, lang);
  return views[0];
}

export async function cartFor(userId: string, lang: Lang, lat: number | null, lng: number | null): Promise<CartShop[]> {
  const db = getDb();
  const lines = await db
    .select()
    .from(deliveryCart)
    .where(eq(deliveryCart.userId, userId))
    .orderBy(asc(deliveryCart.updatedAt));
  if (!lines.length) return [];
  const shopIds = [...new Set(lines.map((line) => line.shopId))];
  const shopRows = await db.select().from(shops).where(inArray(shops.id, shopIds));
  const byShop = new Map(shopRows.map((row) => [row.id, rowToShop(row)]));
  const groups: CartShop[] = [];
  for (const shopId of shopIds) {
    const shop = byShop.get(shopId);
    if (!shop) continue;
    const mine = lines.filter((line) => line.shopId === shopId);
    const viewLines: CartShop["lines"] = [];
    const drop: string[] = [];
    for (const line of mine) {
      const product = shop.products.find((item) => item.id === line.productId);
      const price = product ? sellable(product) : null;
      if (!product || !price) {
        drop.push(line.productId);
        continue;
      }
      viewLines.push({
        productId: product.id,
        title: product.title,
        unit: product.unit,
        priceSom: price.priceSom,
        qty: line.qty,
        photo: product.photo,
        kind: product.kind,
      });
    }
    if (drop.length) {
      await db
        .delete(deliveryCart)
        .where(and(eq(deliveryCart.userId, userId), eq(deliveryCart.shopId, shopId), inArray(deliveryCart.productId, drop)));
    }
    if (!viewLines.length) continue;
    const itemsTotalSom = viewLines.reduce((sum, line) => sum + line.priceSom * line.qty, 0);
    groups.push({
      shopId,
      name: shop.name,
      place: shopPlace(shop, lang),
      lines: viewLines,
      itemsTotalSom,
      quote: quoteFee(routeKm(shop.lat, shop.lng, lat, lng)),
    });
  }
  return groups;
}

export async function setCartQty(userId: string, shopId: string, productId: string, qty: number): Promise<{ ok: true } | Fail> {
  if (!isShopId(shopId) || !isProductId(productId)) return { error: "bad-item", status: 400 };
  if (!Number.isInteger(qty) || qty < 0 || qty > 99) return { error: "bad-qty", status: 400 };
  const db = getDb();
  if (qty === 0) {
    await db.delete(deliveryCart).where(and(eq(deliveryCart.userId, userId), eq(deliveryCart.shopId, shopId), eq(deliveryCart.productId, productId)));
    return { ok: true };
  }
  const shopRow = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shopRow[0] || shopRow[0].status !== "active" || shopRow[0].underReview) return { error: "bad-shop", status: 400 };
  const shop = rowToShop(shopRow[0]);
  const product = shop.products.find((item) => item.id === productId);
  const price = product ? sellable(product) : null;
  if (!product || !price) return { error: "unavailable", status: 400 };
  if (typeof product.quantity === "number" && qty > product.quantity) return { error: "bad-qty", status: 400 };
  await db
    .insert(deliveryCart)
    .values({ userId, shopId, productId, qty, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [deliveryCart.userId, deliveryCart.shopId, deliveryCart.productId],
      set: { qty, updatedAt: new Date() },
    });
  return { ok: true };
}

export async function quoteShop(shopId: string, lat: number | null, lng: number | null): Promise<FeeQuote | Fail> {
  if (!isShopId(shopId)) return { error: "bad-shop", status: 400 };
  const rows = await getDb().select({ lat: shops.lat, lng: shops.lng }).from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!rows[0]) return { error: "not-found", status: 404 };
  return quoteFee(routeKm(rows[0].lat, rows[0].lng, lat, lng));
}

export async function placeOrder(
  userId: string,
  input: { shopId: string; address: string; phone: string; comment: string; lat: number | null; lng: number | null },
  lang: Lang,
): Promise<{ order: OrderView } | Fail> {
  if (!isShopId(input.shopId)) return { error: "bad-shop", status: 400 };
  const address = input.address.trim();
  const comment = input.comment.trim();
  if (address.length < 4 || address.length > 300) return { error: "bad-address", status: 400 };
  if (comment.length > 300) return { error: "bad-comment", status: 400 };
  const phone = normalizePhoneInput(input.phone);
  if (!phone) return { error: "bad-phone", status: 400 };

  try {
    return await bindNoticePushes(() =>
      getDb().transaction(async (tx) => {
        const buyer = await tx
          .select({ blocked: users.orderBlocked, deletedAt: users.deletedAt, bannedAt: users.bannedAt })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (!buyer[0] || buyer[0].deletedAt || buyer[0].bannedAt) return { error: "forbidden", status: 403 };
        if (buyer[0].blocked) return { error: "blocked", status: 403 };

        const shopRow = await tx.select().from(shops).where(eq(shops.id, input.shopId)).limit(1);
        if (!shopRow[0] || shopRow[0].status !== "active" || shopRow[0].underReview) return { error: "bad-shop", status: 400 };
        const shop = rowToShop(shopRow[0]);
        const cart = await tx
          .select()
          .from(deliveryCart)
          .where(and(eq(deliveryCart.userId, userId), eq(deliveryCart.shopId, input.shopId)))
          .for("update");
        if (!cart.length) return { error: "empty", status: 400 };
        if (cart.length > MAX_LINES) return { error: "too-many", status: 400 };

        const priced: { product: ShopProduct; priceSom: number; qty: number }[] = [];
        for (const line of cart) {
          const product = shop.products.find((item) => item.id === line.productId);
          const price = product ? sellable(product) : null;
          if (!product || !price) return { error: "stale", status: 409 };
          if (typeof product.quantity === "number" && line.qty > product.quantity) return { error: "stale", status: 409 };
          priced.push({ product, priceSom: price.priceSom, qty: line.qty });
        }
        const itemsTotalSom = priced.reduce((sum, line) => sum + line.priceSom * line.qty, 0);
        const km = routeKm(shop.lat, shop.lng, input.lat, input.lng);
        const quote = quoteFee(km);
        const [created] = await tx
          .insert(orders)
          .values({
            buyerId: userId,
            shopId: shop.id,
            status: "new",
            addressText: address,
            lat: km == null ? null : input.lat,
            lng: km == null ? null : input.lng,
            phone,
            comment,
            itemsTotalSom,
            deliveryFeeSom: quote.feeSom,
            totalSom: itemsTotalSom + quote.feeSom,
            distanceKm: quote.km,
            feeFlat: quote.flat,
            paymentMethod: "cash",
            deliveryCode: newCode(),
          })
          .returning();
        if (!created) return { error: "fail", status: 500 };
        await tx.insert(orderItems).values(
          priced.map((line) => ({
            orderId: created.id,
            listingId: line.product.listingId || null,
            productId: line.product.id,
            titleSnapshot: line.product.title.slice(0, 200),
            priceSomSnapshot: line.priceSom,
            qty: line.qty,
          })),
        );
        await tx.delete(deliveryCart).where(and(eq(deliveryCart.userId, userId), eq(deliveryCart.shopId, shop.id)));
        await saveNotices(tx, [note(shopRow[0].ownerId, "notifOrderNew", created, "shop", userId)]);
        const buyerName = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const views = await toViews(tx, [{ order: created, shop, ownerId: shopRow[0].ownerId, buyerName: buyerName[0]?.name ?? "" }], "buyer", lang);
        if (!views[0]) return { error: "fail", status: 500 };
        return { order: views[0] };
      }),
    );
  } catch (err) {
    if (uniqueViolation(err)) return { error: "fail", status: 409 };
    throw err;
  }
}

async function one(tx: Tx, orderId: string): Promise<Joined | null> {
  const rows = await loadJoined(tx, [orderId]);
  return rows[0] ?? null;
}

export async function actOnOrder(
  userId: string,
  orderId: string,
  action: string,
  extra: { code?: string; reason?: string },
  lang: Lang,
): Promise<{ order: OrderView } | Fail> {
  if (!isDbUserId(orderId)) return { error: "not-found", status: 404 };
  try {
    return await bindNoticePushes(() =>
      getDb().transaction(async (tx) => {
        const row = await one(tx, orderId);
        if (!row) return { error: "not-found", status: 404 };
        const done = await applyAction(tx, userId, row, action, extra);
        if ("error" in done) return done;
        const fresh = await one(tx, orderId);
        if (!fresh) return { error: "not-found", status: 404 };
        const role: OrderRole = fresh.order.buyerId === userId ? "buyer" : fresh.ownerId === userId ? "shop" : "courier";
        const views = await toViews(tx, [fresh], role, lang);
        if (!views[0]) return { error: "fail", status: 500 };
        return { order: views[0] };
      }),
    );
  } catch (err) {
    if (uniqueViolation(err)) return { error: "busy", status: 409 };
    throw err;
  }
}

async function applyAction(
  tx: Tx,
  userId: string,
  row: Joined,
  action: string,
  extra: { code?: string; reason?: string },
): Promise<{ ok: true } | Fail> {
  const order = row.order;
  const reason = (extra.reason ?? "").trim().slice(0, 200);
  if (action === "cancel") {
    if (order.buyerId !== userId) return { error: "forbidden", status: 403 };
    if (order.status !== "new" && order.status !== "accepted") return { error: "state", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason || null })
      .where(and(eq(orders.id, order.id), inArray(orders.status, ["new", "accepted"])))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(row.ownerId, "notifOrderCancelled", order, "shop", userId)]);
    return { ok: true };
  }
  if (action === "confirm") {
    if (order.buyerId !== userId) return { error: "forbidden", status: 403 };
    if (order.status !== "assembled" || order.buyerConfirmedAt) return { error: "state", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ buyerConfirmedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "assembled"), isNull(orders.buyerConfirmedAt)))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    const couriers = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isCourier, true), eq(users.courierOnline, true), isNull(users.deletedAt), isNull(users.bannedAt)))
      .limit(100);
    const notes: NoticeWrite[] = [note(row.ownerId, "notifOrderReady", order, "shop", userId)];
    for (const courier of couriers) {
      if (courier.id === userId || courier.id === row.ownerId) continue;
      notes.push(note(courier.id, "notifOrderAvailable", order, "courier", null));
    }
    await saveNotices(tx, notes);
    return { ok: true };
  }
  if (action === "accept" || action === "reject" || action === "assemble" || action === "paid" || action === "return") {
    if (row.ownerId !== userId) return { error: "forbidden", status: 403 };
  }
  if (action === "accept") {
    const updated = await tx
      .update(orders)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "new")))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(order.buyerId, "notifOrderAccepted", order, "buyer", userId)]);
    return { ok: true };
  }
  if (action === "reject") {
    const updated = await tx
      .update(orders)
      .set({ status: "rejected", rejectedAt: new Date(), cancelReason: reason || null })
      .where(and(eq(orders.id, order.id), inArray(orders.status, ["new", "accepted"])))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(order.buyerId, "notifOrderRejected", order, "buyer", userId)]);
    return { ok: true };
  }
  if (action === "assemble") {
    const updated = await tx
      .update(orders)
      .set({ status: "assembled", assembledAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "accepted")))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(order.buyerId, "notifOrderAssembled", order, "buyer", userId)]);
    return { ok: true };
  }
  if (action === "paid") {
    const updated = await tx
      .update(orders)
      .set({ shopPaidAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "assigned"), isNull(orders.shopPaidAt)))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    if (updated[0].courierId) await saveNotices(tx, [note(updated[0].courierId, "notifOrderPaid", order, "courier", userId)]);
    return { ok: true };
  }
  if (action === "return") {
    const updated = await tx
      .update(orders)
      .set({ status: "returned", returnedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "refused")))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    const [buyer] = await tx
      .update(users)
      .set({
        refusalCount: sql`${users.refusalCount} + 1`,
        orderBlocked: sql`(${users.refusalCount} + 1) >= 2`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, order.buyerId))
      .returning({ blocked: users.orderBlocked });
    const notes: NoticeWrite[] = [note(order.buyerId, "notifOrderReturned", order, "buyer", userId)];
    if (updated[0].courierId) notes.push(note(updated[0].courierId, "notifOrderReturned", order, "courier", userId));
    if (buyer?.blocked) notes.push(note(order.buyerId, "notifOrderBlocked", order, "buyer", null));
    await saveNotices(tx, notes);
    return { ok: true };
  }
  if (action === "take" || action === "pickup" || action === "deliver" || action === "refuse") {
    const who = await tx
      .select({
        courier: users.isCourier,
        online: users.courierOnline,
        deletedAt: users.deletedAt,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!who[0] || who[0].deletedAt || who[0].bannedAt) return { error: "forbidden", status: 403 };
    if (action === "take" && !who[0].courier) return { error: "forbidden", status: 403 };
    if (action !== "take" && order.courierId !== userId) return { error: "forbidden", status: 403 };
  }
  if (action === "take") {
    if (order.buyerId === userId || row.ownerId === userId) return { error: "own", status: 403 };
    const who = await tx.select({ online: users.courierOnline }).from(users).where(eq(users.id, userId)).limit(1);
    if (!who[0]?.online) return { error: "offline", status: 409 };
    const active = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up", "refused"])))
      .limit(1);
    if (active[0]) return { error: "busy", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ courierId: userId, status: "assigned", assignedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "assembled"), isNotNull(orders.buyerConfirmedAt), isNull(orders.courierId)))
      .returning();
    if (!updated[0]) return { error: "taken", status: 409 };
    await saveNotices(tx, [
      note(order.buyerId, "notifOrderAssigned", order, "buyer", userId),
      note(row.ownerId, "notifOrderAssigned", order, "shop", userId),
    ]);
    return { ok: true };
  }
  if (action === "pickup") {
    if (!order.shopPaidAt) return { error: "need-pay", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ status: "picked_up", pickedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.courierId, userId), eq(orders.status, "assigned"), isNotNull(orders.shopPaidAt)))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(order.buyerId, "notifOrderPicked", order, "buyer", userId)]);
    return { ok: true };
  }
  if (action === "deliver") {
    if (order.status !== "picked_up" || order.courierId !== userId) return { error: "state", status: 409 };
    if (order.codeFails >= CODE_FAIL_CAP) return { error: "too-many", status: 429 };
    const code = (extra.code ?? "").trim();
    if (!/^[0-9]{4}$/.test(code) || !sameCode(order.deliveryCode, code)) {
      await tx.update(orders).set({ codeFails: sql`${orders.codeFails} + 1` }).where(eq(orders.id, order.id));
      return { error: "bad-code", status: 400 };
    }
    const updated = await tx
      .update(orders)
      .set({ status: "delivered", deliveredAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.courierId, userId), eq(orders.status, "picked_up")))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [
      note(order.buyerId, "notifOrderDelivered", order, "buyer", userId),
      note(row.ownerId, "notifOrderDelivered", order, "shop", userId),
    ]);
    return { ok: true };
  }
  if (action === "refuse") {
    const updated = await tx
      .update(orders)
      .set({ status: "refused", refusedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up"])))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(row.ownerId, "notifOrderRefused", order, "shop", userId)]);
    return { ok: true };
  }
  return { error: "bad-action", status: 400 };
}

export async function courierBoard(
  userId: string,
  lang: Lang,
  lat: number | null,
  lng: number | null,
): Promise<{ online: boolean; courier: boolean; active: OrderView | null; available: CourierOffer[] } | Fail> {
  const db = getDb();
  const who = await db
    .select({ courier: users.isCourier, online: users.courierOnline, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!who[0] || who[0].deletedAt) return { error: "forbidden", status: 403 };
  const activeIds = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up", "refused"])))
    .orderBy(desc(orders.assignedAt))
    .limit(1);
  const activeJoined = await loadJoined(db, activeIds.map((row) => row.id));
  const activeViews = await toViews(db, activeJoined, "courier", lang);
  let available: CourierOffer[] = [];
  if (who[0].courier && who[0].online && !activeViews.length) {
    const rows = await db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(orders.shopId, shops.id))
      .where(and(eq(orders.status, "assembled"), isNotNull(orders.buyerConfirmedAt), isNull(orders.courierId)))
      .orderBy(asc(orders.assembledAt))
      .limit(30);
    available = rows
      .filter((row) => row.order.buyerId !== userId && row.shop.ownerId !== userId)
      .map((row) => {
        const shop = rowToShop(row.shop);
        const km = routeKm(shop.lat, shop.lng, lat, lng);
        return {
          id: row.order.id,
          no: row.order.publicNo,
          shopName: shop.name,
          shopPlace: shopPlace(shop, lang),
          feeSom: row.order.deliveryFeeSom,
          itemsTotalSom: row.order.itemsTotalSom,
          km: km == null ? null : Math.round(km * 10) / 10,
        };
      });
  }
  return { online: who[0].online, courier: who[0].courier, active: activeViews[0] ?? null, available };
}

/** Drop a courier off an order they have not picked up yet, so another courier can take it. */
export async function releaseAssignedOrders(userId: string): Promise<void> {
  await getDb()
    .update(orders)
    .set({ courierId: null, status: "assembled", assignedAt: null, shopPaidAt: null })
    .where(and(eq(orders.courierId, userId), eq(orders.status, "assigned")));
}
