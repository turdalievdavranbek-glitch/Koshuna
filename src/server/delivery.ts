import { randomInt, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { haversineKm, inKonshuZone } from "@/lib/geo";
import { commissionAmount, isOrderStatus, isProductId, isShopId, type CartProblem, type CartShop, type CourierOffer, type FeeQuote, type OrderRole, type OrderStatus, type OrderView } from "@/lib/delivery";
import { isDbUserId, normalizePhoneInput } from "@/lib/phone";
import { shopCallPhone, shopDistrictName, shopLandmarkLine } from "@/lib/shops";
import type { Lang, Shop, ShopProduct } from "@/lib/types";
import { getDb } from "./db";
import { deliveryCart, orderItems, orderOffers, orders, shops, users } from "./db/schema";
import { rowToShop } from "./mappers";
import { declineOffer, expireOrderOffers, liveOfferFor, liveOfferedOrderIds, offerBlocks, offerNext, skipCourier } from "./delivery-dispatch";
import { clearOrderTrack, etaSpanForCourier } from "./delivery-track";
import { guardBuyerOrder } from "./delivery-rules";
import { FEATURES } from "@/lib/features";
import { clientDiscount, rememberClientDiscount, rewardCourierReferral } from "./delivery-referrals";
import { courierIsPaused, reviewShop } from "./delivery-standing";
import { readCommissionPercent } from "./commission-rate";
import { kickDeliverySweep } from "./delivery-sweep";
import { bindNoticePushes, saveNotices, type NoticeWrite } from "./notices";

type Fail = { error: string; status: number };
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

const CODE_FAIL_CAP = 5;
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

function maxDeliveryKm(): number {
  const raw = Number(process.env.DELIVERY_MAX_KM);
  if (!Number.isFinite(raw) || raw <= 0 || raw > 500) return 40;
  return raw;
}

/** Base + per km when both points are in the Коңшу zone. A non-positive distance is free. No geo uses the flat fee. */
export function quoteFee(km: number | null): FeeQuote {
  const rates = deliveryRates();
  const maxFee = envInt("DELIVERY_MAX_FEE_SOM", 2000);
  if (km == null) return { ...rates, feeSom: rates.flatSom, km: null, flat: true, tooFar: false };
  const rounded = Math.round(km * 10) / 10;
  if (km <= 0) return { ...rates, feeSom: 0, km: 0, flat: false, tooFar: false };
  if (km > maxDeliveryKm()) return { ...rates, feeSom: 0, km: rounded, flat: false, tooFar: true };
  const feeSom = Math.max(0, Math.round(rates.baseSom + rates.perKmSom * km));
  if (feeSom > maxFee) return { ...rates, feeSom: 0, km: rounded, flat: false, tooFar: true };
  return { ...rates, feeSom, km: rounded, flat: false, tooFar: false };
}

/** How far a courier with a GPS fix can be from a shop that also has a fix. */
export function courierRadiusKm(): number {
  const raw = Number(process.env.DELIVERY_COURIER_RADIUS_KM);
  if (!Number.isFinite(raw) || raw <= 0 || raw > 500) return 10;
  return raw;
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
  return walkError(err, (row) => row.code === "23505");
}

function constraintName(err: unknown): string {
  let name = "";
  walkError(err, (row) => {
    const constraint = typeof row.constraint === "string" ? row.constraint : "";
    const message = typeof row.message === "string" ? row.message : "";
    if (constraint || message.includes("orders_one_open_buyer")) name = constraint || message;
    return false;
  });
  return name;
}

function walkError(err: unknown, visit: (row: { code?: unknown; constraint?: unknown; message?: unknown }) => boolean): boolean {
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if (visit(cur as { code?: unknown; constraint?: unknown; message?: unknown })) return true;
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
    const courierSeesDropoff = role === "courier" && (status === "assigned" || status === "picked_up" || status === "refused" || status === "returned" || status === "delivered");
    const codeLocked = row.order.codeFails >= CODE_FAIL_CAP || row.order.adminFlag === "code_locked";
    return {
      id: row.order.id,
      no: row.order.publicNo,
      status,
      role,
      shopId: row.order.shopId,
      shopName: row.shop.name,
      shopPlace: shopPlace(row.shop, lang),
      shopPhone: buyer || courierSeesDropoff ? shopCallPhone(row.shop) || null : null,
      buyerName: row.buyerName,
      buyerPhone: role === "shop" || courierSeesDropoff ? row.order.phone : null,
      address: role === "courier" && !courierSeesDropoff ? "" : row.order.addressText,
      comment: row.order.comment,
      items: byOrder.get(row.order.id) ?? [],
      itemsTotalSom: row.order.itemsTotalSom,
      deliveryFeeSom: row.order.deliveryFeeSom,
      discountSom: row.order.referralDiscountSom,
      commissionPercent: Number(row.order.commissionPercent ?? 0),
      commissionSom: row.order.commissionSom ?? 0,
      totalSom: row.order.totalSom,
      hasReceipt: Boolean(row.order.receiptPath),
      km: row.order.distanceKm == null ? null : Math.round(row.order.distanceKm * 10) / 10,
      flatFee: row.order.feeFlat,
      buyerConfirmed: row.order.buyerConfirmedAt != null,
      shopPaid: row.order.shopPaidAt != null,
      deliveryCode: buyer && showCode(status) && !codeLocked ? row.order.deliveryCode : null,
      codeLocked: buyer || role === "courier" ? codeLocked : undefined,
      createdAt: row.order.createdAt.toISOString(),
    };
  });
}

export async function listBuyerOrders(userId: string, lang: Lang): Promise<OrderView[]> {
  kickDeliverySweep();
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
  kickDeliverySweep();
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
  kickDeliverySweep();
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
  const percent = await readCommissionPercent();
  for (const shopId of shopIds) {
    const shop = byShop.get(shopId);
    if (!shop) continue;
    const mine = lines.filter((line) => line.shopId === shopId);
    const closed = shop.status !== "active" || shop.underReview === true;
    const viewLines: CartShop["lines"] = [];
    for (const line of mine) {
      const product = shop.products.find((item) => item.id === line.productId);
      const price = product ? sellable(product) : null;
      if (!product || !price) {
        viewLines.push({
          productId: line.productId,
          title: product?.title || "",
          unit: product?.unit || "",
          priceSom: line.priceSom ?? 0,
          qty: line.qty,
          listedSom: line.priceSom,
          unavailable: true,
        });
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
        listedSom: line.priceSom,
        changed: line.priceSom != null && line.priceSom !== price.priceSom,
      });
    }
    if (!viewLines.length) continue;
    const itemsTotalSom = viewLines.reduce((sum, line) => (line.unavailable ? sum : sum + line.priceSom * line.qty), 0);
    groups.push({
      shopId,
      name: shop.name,
      place: shopPlace(shop, lang),
      lines: viewLines,
      itemsTotalSom,
      quote: quoteFee(routeKm(shop.lat, shop.lng, lat, lng)),
      commissionPercent: percent,
      commissionSom: commissionAmount(itemsTotalSom, percent),
      closed,
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
    .values({ userId, shopId, productId, qty, priceSom: price.priceSom, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [deliveryCart.userId, deliveryCart.shopId, deliveryCart.productId],
      set: { qty, priceSom: price.priceSom, updatedAt: new Date() },
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
  input: { shopId: string; address: string; phone: string; comment: string; lat: number | null; lng: number | null; acceptPrices?: boolean },
  lang: Lang,
): Promise<{ order: OrderView } | (Fail & { changes?: CartProblem[] })> {
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
        if (!shopRow[0] || shopRow[0].status !== "active" || shopRow[0].underReview || shopRow[0].deliveryEnabled === false) {
          return { error: shopRow[0] && shopRow[0].deliveryEnabled === false ? "delivery-off" : "shop-closed", status: 409 };
        }
        const owner = await tx.select({ bannedAt: users.bannedAt, deletedAt: users.deletedAt }).from(users).where(eq(users.id, shopRow[0].ownerId)).limit(1);
        if (!owner[0] || owner[0].bannedAt || owner[0].deletedAt) return { error: "shop-closed", status: 409 };
        const shop = rowToShop(shopRow[0]);
        const cart = await tx
          .select()
          .from(deliveryCart)
          .where(and(eq(deliveryCart.userId, userId), eq(deliveryCart.shopId, input.shopId)))
          .for("update");
        if (!cart.length) {
          const recent = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.buyerId, userId), eq(orders.shopId, input.shopId), eq(orders.status, "new"), sql`${orders.createdAt} > now() - interval '3 minutes'`))
            .orderBy(desc(orders.createdAt))
            .limit(1);
          if (recent[0]) {
            const buyerName = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
            const views = await toViews(tx, [{ order: recent[0], shop, ownerId: shopRow[0].ownerId, buyerName: buyerName[0]?.name ?? "" }], "buyer", lang);
            if (views[0]) return { order: views[0] };
          }
          return { error: "empty", status: 400 };
        }
        if (cart.length > MAX_LINES) return { error: "too-many", status: 400 };

        const priced: { product: ShopProduct; priceSom: number; qty: number }[] = [];
        const changes: CartProblem[] = [];
        for (const line of cart) {
          if (line.shopId !== input.shopId) continue;
          const product = shop.products.find((item) => item.id === line.productId);
          const price = product ? sellable(product) : null;
          if (!product || !price) {
            changes.push({ title: product?.title || line.productId, kind: "gone" });
            continue;
          }
          if (typeof product.quantity === "number" && line.qty > product.quantity) {
            changes.push({ title: product.title, kind: "stock", to: product.quantity });
            continue;
          }
          if (!input.acceptPrices && line.priceSom != null && line.priceSom !== price.priceSom) {
            changes.push({ title: product.title, kind: "price", from: line.priceSom, to: price.priceSom });
            continue;
          }
          priced.push({ product, priceSom: price.priceSom, qty: line.qty });
        }
        if (changes.length) {
          const kind = changes.some((row) => row.kind !== "price") ? "stale" : "price-changed";
          return { error: kind, status: 409, changes };
        }
        if (!priced.length) return { error: "empty", status: 400 };
        const itemsTotalSom = priced.reduce((sum, line) => sum + line.priceSom * line.qty, 0);
        const km = routeKm(shop.lat, shop.lng, input.lat, input.lng);
        const quote = quoteFee(km);
        if (quote.tooFar) return { error: "too-far", status: 409 };
        const discountSom = FEATURES.referrals ? await clientDiscount(tx, userId, quote.feeSom) : 0;
        const percent = await readCommissionPercent();
        const commissionSom = commissionAmount(itemsTotalSom, percent);
        const totalSom = itemsTotalSom + quote.feeSom - discountSom + commissionSom;
        const blockedBuyer = await guardBuyerOrder(tx, userId, totalSom);
        if (blockedBuyer) return blockedBuyer;
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
            referralDiscountSom: discountSom,
            commissionPercent: percent.toFixed(2),
            commissionSom,
            totalSom,
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
        if (FEATURES.referrals) await rememberClientDiscount(tx, userId, discountSom);
        await saveNotices(tx, [note(shopRow[0].ownerId, "notifOrderNew", created, "shop", userId)]);
        const buyerName = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const views = await toViews(tx, [{ order: created, shop, ownerId: shopRow[0].ownerId, buyerName: buyerName[0]?.name ?? "" }], "buyer", lang);
        if (!views[0]) return { error: "fail", status: 500 };
        return { order: views[0] };
      }),
    );
  } catch (err) {
    if (uniqueViolation(err)) {
      if (constraintName(err).includes("orders_one_open_buyer")) return { error: "open-order", status: 409 };
      return { error: "fail", status: 409 };
    }
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
    const result = await bindNoticePushes(() =>
      getDb().transaction(async (tx) => {
        await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).for("update");
        const row = await one(tx, orderId);
        if (!row) return { error: "not-found", status: 404 };
        const done = await applyAction(tx, userId, row, action, extra);
        if ("error" in done) return done;
        const fresh = await one(tx, orderId);
        if (!fresh) return { error: "not-found", status: 404 };
        const role: OrderRole = fresh.order.buyerId === userId ? "buyer" : fresh.ownerId === userId ? "shop" : "courier";
        const views = await toViews(tx, [fresh], role, lang);
        if (!views[0]) return { error: "fail", status: 500 };
        return { order: views[0], shopId: fresh.order.shopId, courierId: fresh.order.courierId };
      }),
    );
    if ("error" in result) return result;
    if (action === "release") await skipCourier(orderId, userId).catch(() => undefined);
    if (action === "cancel" || action === "reject") await expireOrderOffers(orderId).catch(() => undefined);
    if (action === "confirm" || action === "release" || action === "decline") {
      await offerNext(orderId).catch(() => undefined);
    }
    if (FEATURES.referrals && action === "deliver" && result.courierId) {
      await rewardCourierReferral(result.courierId).catch(() => undefined);
    }
    if (action === "reject" || (action === "cancel" && result.order.role === "shop")) {
      await reviewShop(result.shopId).catch(() => undefined);
    }
    if (result.order.status !== "assigned" && result.order.status !== "picked_up") {
      await clearOrderTrack(orderId).catch(() => undefined);
    }
    return { order: result.order };
  } catch (err) {
    if (uniqueViolation(err)) return { error: "busy", status: 409 };
    throw err;
  }
}

function replayed(action: string, userId: string, row: Joined): boolean {
  const order = row.order;
  const pastAccept = ["accepted", "assembled", "assigned", "picked_up", "delivered"];
  if (action === "accept" && row.ownerId === userId && pastAccept.includes(order.status)) return true;
  if (action === "assemble" && row.ownerId === userId && ["assembled", "assigned", "picked_up", "delivered"].includes(order.status)) return true;
  if (action === "confirm" && order.buyerId === userId && order.buyerConfirmedAt != null) return true;
  if (action === "paid" && row.ownerId === userId && order.shopPaidAt != null) return true;
  if (action === "pickup" && order.courierId === userId && (order.status === "picked_up" || order.status === "delivered")) return true;
  if (action === "deliver" && order.courierId === userId && order.status === "delivered") return true;
  if (action === "reject" && row.ownerId === userId && order.status === "rejected") return true;
  if (action === "return" && row.ownerId === userId && order.status === "returned") return true;
  if (action === "refuse" && (order.courierId === userId || order.buyerId === userId) && (order.status === "refused" || order.status === "returned")) return true;
  if (action === "take" && order.courierId === userId && ["assigned", "picked_up", "delivered"].includes(order.status)) return true;
  if (action === "cancel" && (order.buyerId === userId || row.ownerId === userId) && ["cancelled", "rejected", "returned"].includes(order.status)) return true;
  if (action === "cancel" && order.buyerId === userId && order.status === "refused") return true;
  return false;
}

async function notifyAdmins(tx: Tx, order: Joined["order"], textKey: string): Promise<void> {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), isNull(users.deletedAt), isNull(users.bannedAt)))
    .limit(20);
  if (!admins.length) return;
  await saveNotices(
    tx,
    admins.map((admin) => note(admin.id, textKey, order, "shop", null)),
  );
}

async function cancelOrder(tx: Tx, userId: string, row: Joined, reason: string): Promise<{ ok: true } | Fail> {
  const order = row.order;
  const buyer = order.buyerId === userId;
  const shop = row.ownerId === userId;
  if (!buyer && !shop) return { error: "forbidden", status: 403 };
  if (buyer && order.status === "picked_up") {
    const updated = await tx
      .update(orders)
      .set({ status: "refused", refusedAt: new Date(), cancelReason: reason || "buyer" })
      .where(and(eq(orders.id, order.id), eq(orders.status, "picked_up")))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    const notes: NoticeWrite[] = [note(row.ownerId, "notifOrderRefused", order, "shop", userId)];
    if (order.courierId) notes.push(note(order.courierId, "notifOrderRefused", order, "courier", userId));
    await saveNotices(tx, notes);
    return { ok: true };
  }
  if (order.status === "picked_up" || order.status === "delivered" || order.status === "refused") return { error: "after-pickup", status: 409 };
  const allowed = ["new", "accepted", "assembled", "assigned"];
  if (!allowed.includes(order.status)) return { error: "state", status: 409 };
  const updated = await tx
    .update(orders)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason || (buyer ? "buyer" : "shop"), courierId: null })
    .where(and(eq(orders.id, order.id), inArray(orders.status, allowed)))
    .returning();
  if (!updated[0]) return { error: "state", status: 409 };
  const notes: NoticeWrite[] = [note(buyer ? row.ownerId : order.buyerId, "notifOrderCancelled", order, buyer ? "shop" : "buyer", userId)];
  if (order.courierId && order.courierId !== userId) notes.push(note(order.courierId, "notifOrderCancelled", order, "courier", userId));
  await saveNotices(tx, notes);
  return { ok: true };
}

async function releaseOrder(tx: Tx, userId: string, row: Joined): Promise<{ ok: true } | Fail> {
  const order = row.order;
  if (order.courierId !== userId) return { error: "forbidden", status: 403 };
  if (order.status !== "assigned") return { error: "state", status: 409 };
  const updated = await tx
    .update(orders)
    .set({ status: "assembled", courierId: null, assignedAt: null })
    .where(and(eq(orders.id, order.id), eq(orders.courierId, userId), eq(orders.status, "assigned")))
    .returning();
  if (!updated[0]) return { error: "state", status: 409 };
  await saveNotices(tx, [
    note(order.buyerId, "notifOrderReleased", order, "buyer", userId),
    note(row.ownerId, "notifOrderReleased", order, "shop", userId),
  ]);
  return { ok: true };
}

async function resendCode(tx: Tx, userId: string, row: Joined): Promise<{ ok: true } | Fail> {
  const order = row.order;
  if (order.buyerId !== userId) return { error: "forbidden", status: 403 };
  if (order.codeFails >= CODE_FAIL_CAP || order.adminFlag === "code_locked") return { error: "code-locked", status: 429 };
  if (!showCode(isOrderStatus(order.status) ? order.status : "new")) return { error: "state", status: 409 };
  await saveNotices(tx, [
    {
      userId,
      type: "order",
      textKey: "notifOrderCode",
      params: { title: order.deliveryCode, orderId: order.id, shopId: order.shopId, audience: "buyer" },
      actorId: null,
    },
  ]);
  return { ok: true };
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
  if (replayed(action, userId, row)) return { ok: true };
  if (action === "cancel") return cancelOrder(tx, userId, row, reason);
  if (action === "release") return releaseOrder(tx, userId, row);
  if (action === "resend") return resendCode(tx, userId, row);
  if (action === "confirm") {
    if (order.buyerId !== userId) return { error: "forbidden", status: 403 };
    if (order.status !== "assembled" || order.buyerConfirmedAt) return { error: "state", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ buyerConfirmedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "assembled"), isNull(orders.buyerConfirmedAt)))
      .returning();
    if (!updated[0]) return { error: "state", status: 409 };
    await saveNotices(tx, [note(row.ownerId, "notifOrderReady", order, "shop", userId)]);
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
  if (action === "decline") {
    const ok = await declineOffer(order.id, userId);
    if (!ok) return { error: "state", status: 409 };
    return { ok: true };
  }
  if (action === "take" || action === "pickup" || action === "deliver" || action === "refuse") {
    const who = await tx
      .select({
        courier: users.isCourier,
        online: users.courierOnline,
        deletedAt: users.deletedAt,
        bannedAt: users.bannedAt,
        soft: users.courierSoftBanned,
        pausedUntil: users.courierPausedUntil,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!who[0] || who[0].deletedAt || who[0].bannedAt) return { error: "forbidden", status: 403 };
    if (action === "take" && courierIsPaused({ courierSoftBanned: who[0].soft, courierPausedUntil: who[0].pausedUntil })) {
      return { error: who[0].soft ? "soft-ban" : "paused", status: 403 };
    }
    if (action === "take" && !who[0].courier) return { error: "forbidden", status: 403 };
    if (action !== "take" && order.courierId !== userId) return { error: "forbidden", status: 403 };
  }
  if (action === "take") {
    if (order.buyerId === userId || row.ownerId === userId) return { error: "own", status: 403 };
    if (await offerBlocks(order.id, userId)) return { error: "offered", status: 409 };
    const who = await tx.select({ online: users.courierOnline, city: users.courierCity }).from(users).where(eq(users.id, userId)).limit(1);
    if (!who[0]?.online) return { error: "offline", status: 409 };
    if (!who[0].city) return { error: "need-place", status: 409 };
    if (row.shop.city && row.shop.city !== who[0].city) return { error: "state", status: 409 };
    const active = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up", "refused"])))
      .limit(1);
    if (active[0]) return { error: "busy", status: 409 };
    const updated = await tx
      .update(orders)
      .set({ courierId: userId, status: "assigned", assignedAt: new Date() })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.status, "assembled"),
          isNotNull(orders.buyerConfirmedAt),
          isNull(orders.courierId),
          sql`not exists (
            select 1 from ${orderOffers}
            where ${orderOffers.orderId} = ${orders.id}
              and ${orderOffers.status} = 'offered'
              and ${orderOffers.expiresAt} > now()
              and ${orderOffers.courierId} <> ${userId}
          )`,
        ),
      )
      .returning();
    if (!updated[0]) {
      if (await offerBlocks(order.id, userId)) return { error: "offered", status: 409 };
      return { error: "taken", status: 409 };
    }
    await tx
      .update(orderOffers)
      .set({ status: "accepted" })
      .where(and(eq(orderOffers.orderId, order.id), eq(orderOffers.courierId, userId), eq(orderOffers.status, "offered")));
    const eta = await etaSpanForCourier(order.id, userId, false);
    await saveNotices(tx, [
      {
        userId: order.buyerId,
        type: "order",
        textKey: "notifOrderEta",
        params: { title: eta, orderId: order.id, shopId: order.shopId, audience: "buyer" },
        actorId: userId,
      },
      note(row.ownerId, "notifOrderAssigned", order, "shop", userId),
    ]);
    return { ok: true };
  }
  if (action === "pickup") {
    if (!order.shopPaidAt) return { error: "need-pay", status: 409 };
    if (!order.receiptPath) return { error: "need-receipt", status: 409 };
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
    if (order.codeFails >= CODE_FAIL_CAP || order.adminFlag === "code_locked") return { error: "code-locked", status: 429 };
    const code = (extra.code ?? "").trim();
    if (!/^[0-9]{4}$/.test(code) || !sameCode(order.deliveryCode, code)) {
      const [bumped] = await tx
        .update(orders)
        .set({
          codeFails: sql`${orders.codeFails} + 1`,
          adminFlag: sql`case when ${orders.codeFails} + 1 >= ${CODE_FAIL_CAP} and ${orders.adminFlag} is null then 'code_locked' else ${orders.adminFlag} end`,
        })
        .where(and(eq(orders.id, order.id), sql`${orders.codeFails} < ${CODE_FAIL_CAP}`))
        .returning({ fails: orders.codeFails });
      if (!bumped) return { error: "code-locked", status: 429 };
      if (bumped.fails >= CODE_FAIL_CAP) await notifyAdmins(tx, order, "notifOrderCodeLocked");
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
): Promise<{ online: boolean; courier: boolean; city: string | null; district: string | null; paused: boolean; softBanned: boolean; offer: (CourierOffer & { expiresAt: string }) | null; active: OrderView | null; available: CourierOffer[] } | Fail> {
  kickDeliverySweep();
  const db = getDb();
  const who = await db
    .select({
      courier: users.isCourier,
      online: users.courierOnline,
      deletedAt: users.deletedAt,
      city: users.courierCity,
      district: users.courierDistrict,
      lastLat: users.lastLat,
      lastLng: users.lastLng,
      soft: users.courierSoftBanned,
      pausedUntil: users.courierPausedUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!who[0] || who[0].deletedAt) return { error: "forbidden", status: 403 };
  const place = { city: who[0].city, district: who[0].district };
  const activeIds = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.courierId, userId), inArray(orders.status, ["assigned", "picked_up", "refused"])))
    .orderBy(desc(orders.assignedAt))
    .limit(1);
  const activeJoined = await loadJoined(db, activeIds.map((row) => row.id));
  const activeViews = await toViews(db, activeJoined, "courier", lang);
  let available: CourierOffer[] = [];
  const fix =
    lat != null && lng != null
      ? { lat, lng }
      : who[0].lastLat != null && who[0].lastLng != null && Number.isFinite(who[0].lastLat) && Number.isFinite(who[0].lastLng)
        ? { lat: who[0].lastLat, lng: who[0].lastLng }
        : null;
    const held = await liveOfferedOrderIds();
    if (who[0].courier && who[0].online && who[0].city && !activeViews.length) {
    const radius = courierRadiusKm();
    const rows = await db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(orders.shopId, shops.id))
      .where(and(eq(orders.status, "assembled"), isNotNull(orders.buyerConfirmedAt), isNull(orders.courierId), eq(shops.city, who[0].city)))
      .orderBy(asc(orders.assembledAt))
      .limit(40);
    available = rows
      .filter((row) => {
        if (row.order.buyerId === userId || row.shop.ownerId === userId) return false;
        if (held.has(row.order.id)) return false;
        if (fix && row.shop.lat != null && row.shop.lng != null) {
          return haversineKm(fix.lat, fix.lng, row.shop.lat, row.shop.lng) <= radius;
        }
        return true;
      })
      .map((row) => {
        const shop = rowToShop(row.shop);
        const km = routeKm(shop.lat, shop.lng, fix?.lat, fix?.lng);
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
  let offer: (CourierOffer & { expiresAt: string }) | null = null;
  const mine = !activeViews.length ? await liveOfferFor(userId) : null;
  if (mine) {
    const offered = await db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(orders.shopId, shops.id))
      .where(eq(orders.id, mine.orderId))
      .limit(1);
    const row = offered[0];
    if (row && row.order.status === "assembled" && !row.order.courierId) {
      const shop = rowToShop(row.shop);
      const km = routeKm(shop.lat, shop.lng, fix?.lat, fix?.lng);
      offer = {
        id: row.order.id,
        no: row.order.publicNo,
        shopName: shop.name,
        shopPlace: shopPlace(shop, lang),
        feeSom: row.order.deliveryFeeSom,
        itemsTotalSom: row.order.itemsTotalSom,
        km: km == null ? null : Math.round(km * 10) / 10,
        expiresAt: mine.expiresAt.toISOString(),
      };
    }
  }
  const pause = courierIsPaused({ courierSoftBanned: who[0].soft, courierPausedUntil: who[0].pausedUntil });
  return {
    online: who[0].online,
    courier: who[0].courier,
    city: place.city,
    district: place.district,
    paused: pause,
    softBanned: who[0].soft,
    offer,
    active: activeViews[0] ?? null,
    available,
  };
}

/** Drop a courier off an order they have not picked up yet, so another courier can take it. */
export async function releaseAssignedOrders(userId: string): Promise<void> {
  await getDb()
    .update(orders)
    .set({ courierId: null, status: "assembled", assignedAt: null, shopPaidAt: null })
    .where(and(eq(orders.courierId, userId), eq(orders.status, "assigned")));
}
