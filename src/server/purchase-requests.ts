import { and, desc, eq, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { adminAreaById } from "@/lib/admin-areas";
import { BUY_CATEGORIES, formatBuyQuantity, isBuyUnit, pointMatchesRequest, todayBishkek, type BuyRequestRow, type BuyRequestStatus } from "@/lib/buy-request";
import { holdPersonName } from "@/lib/public-name";
import { openRequestThread } from "./chat";
import { getDb } from "./db";
import { notifications, purchaseRequests, shops, users } from "./db/schema";

const TEXT_MAX = 500;
const QTY_MAX = 1_000_000;
const OPEN = "open";
const DELETED = "deleted";

type Fail = { error: string; status: number };

function extrasOf(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") return [];
  const list = (doc as { extraCategories?: unknown }).extraCategories;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string");
}

function deadlineFromDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  if (isoDate < todayBishkek()) return null;
  const end = new Date(`${isoDate}T23:59:59+06:00`);
  return Number.isNaN(end.getTime()) ? null : end;
}

function statusOf(value: string): BuyRequestStatus {
  if (value === "found" || value === "closed") return value;
  if (value === DELETED) return "closed";
  return "open";
}

/** Past the deadline, a request is closed. Called when lists are read and by the cleanup job. */
export async function closeExpiredPurchaseRequests(): Promise<number> {
  const rows = await getDb()
    .update(purchaseRequests)
    .set({ status: "closed" })
    .where(and(eq(purchaseRequests.status, OPEN), isNotNull(purchaseRequests.deadline), lt(purchaseRequests.deadline, new Date())))
    .returning({ id: purchaseRequests.id });
  return rows.length;
}

type ShopHit = {
  id: string;
  ownerId: string;
  category: string;
  extraCategories: string[];
  city: string;
  district: string | null;
};

async function matchingShops(category: string, oblast: string): Promise<ShopHit[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: shops.id,
      ownerId: shops.ownerId,
      group: shops.group,
      city: shops.city,
      district: shops.district,
      doc: shops.doc,
    })
    .from(shops)
    .where(
      and(
        eq(shops.status, "active"),
        sql`(${shops.group} = ${category} or jsonb_exists(coalesce(${shops.doc}->'extraCategories', '[]'::jsonb), ${category}))`,
      ),
    );
  return rows
    .map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      category: row.group,
      extraCategories: extrasOf(row.doc),
      city: row.city,
      district: row.district,
    }))
    .filter((row) => pointMatchesRequest(row, { category, oblast }));
}

function toRow(
  row: {
    id: string;
    category: string;
    text: string;
    quantity: string | null;
    unit: string | null;
    city: string;
    district: string | null;
    deadline: Date | null;
    needsDelivery: boolean;
    status: string;
    createdAt: Date;
  },
  extra?: { buyerName?: string; shopId?: string },
): BuyRequestRow {
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    quantity: formatBuyQuantity(row.quantity),
    unit: row.unit ?? "",
    oblast: row.city,
    district: row.district ?? "",
    deadline: row.deadline ? row.deadline.toISOString() : "",
    needsDelivery: row.needsDelivery,
    status: statusOf(row.status),
    createdAt: row.createdAt.toISOString(),
    buyerName: extra?.buyerName,
    shopId: extra?.shopId,
  };
}

export async function createPurchaseRequest(
  buyerId: string,
  input: { category?: string; text?: string; quantity?: unknown; unit?: unknown; district?: string; deadline?: string; needsDelivery?: unknown },
): Promise<{ request: BuyRequestRow } | Fail> {
  const category = (input.category ?? "").trim();
  if (!(BUY_CATEGORIES as readonly string[]).includes(category)) return { error: "category", status: 400 };
  const text = (input.text ?? "").trim();
  if (!text || text.length > TEXT_MAX) return { error: "text", status: 400 };
  const quantity = typeof input.quantity === "number" ? input.quantity : Number(String(input.quantity ?? "").trim());
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > QTY_MAX) return { error: "quantity", status: 400 };
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  if (!isBuyUnit(unit)) return { error: "unit", status: 400 };
  const district = (input.district ?? "").trim();
  const area = adminAreaById(district);
  if (!area) return { error: "district", status: 400 };
  const deadline = deadlineFromDate((input.deadline ?? "").trim());
  if (!deadline) return { error: "deadline", status: 400 };
  const needsDelivery = input.needsDelivery === true;

  const db = getDb();
  const inserted = await db
    .insert(purchaseRequests)
    .values({
      buyerId,
      category,
      text,
      quantity: String(quantity),
      unit,
      city: area.oblast,
      district: area.id,
      deadline,
      needsDelivery,
      status: OPEN,
    })
    .returning();
  const row = inserted[0];
  if (!row) return { error: "save", status: 500 };

  const hits = (await matchingShops(category, area.oblast)).filter((shop) => shop.ownerId !== buyerId);
  const owners = [...new Set(hits.map((shop) => shop.ownerId))];
  if (owners.length) {
    const title = text.slice(0, 120);
    await db.insert(notifications).values(
      owners.map((userId) => ({
        userId,
        type: "purchase_request",
        textKey: "notifBuyRequest",
        params: { title, requestId: row.id },
      })),
    );
  }
  return { request: toRow(row) };
}

export async function listMyPurchaseRequests(buyerId: string): Promise<BuyRequestRow[]> {
  await closeExpiredPurchaseRequests();
  const rows = await getDb()
    .select()
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.buyerId, buyerId), ne(purchaseRequests.status, DELETED)))
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(50);
  return rows.map((row) => toRow(row));
}

export async function closePurchaseRequest(buyerId: string, requestId: string): Promise<{ request: BuyRequestRow } | Fail> {
  const db = getDb();
  const found = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, requestId)).limit(1);
  const row = found[0];
  if (!row || row.buyerId !== buyerId || row.status === DELETED) return { error: "not-found", status: 404 };
  if (row.status !== OPEN) return { request: toRow(row) };
  const updated = await db
    .update(purchaseRequests)
    .set({ status: "found" })
    .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.buyerId, buyerId), eq(purchaseRequests.status, OPEN)))
    .returning();
  return { request: toRow(updated[0] ?? { ...row, status: "found" }) };
}

/** Author only. The row stays so an existing chat still has its request. Sellers stop seeing it. */
export async function deletePurchaseRequest(buyerId: string, requestId: string): Promise<{ ok: true } | Fail> {
  const db = getDb();
  const found = await db
    .select({ buyerId: purchaseRequests.buyerId, status: purchaseRequests.status })
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, requestId))
    .limit(1);
  const row = found[0];
  if (!row || row.buyerId !== buyerId) return { error: "not-found", status: 404 };
  if (row.status !== DELETED) {
    await db
      .update(purchaseRequests)
      .set({ status: DELETED })
      .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.buyerId, buyerId)));
  }
  return { ok: true };
}

export async function listIncomingPurchaseRequests(userId: string): Promise<BuyRequestRow[]> {
  await closeExpiredPurchaseRequests();
  const db = getDb();
  const mine = await db
    .select({
      id: shops.id,
      ownerId: shops.ownerId,
      group: shops.group,
      city: shops.city,
      district: shops.district,
      doc: shops.doc,
    })
    .from(shops)
    .where(and(eq(shops.ownerId, userId), eq(shops.status, "active")));
  const points = mine.map((row) => ({
    id: row.id,
    category: row.group,
    extraCategories: extrasOf(row.doc),
    city: row.city,
    district: row.district,
  }));
  if (!points.length) return [];

  const open = await db
    .select({
      id: purchaseRequests.id,
      category: purchaseRequests.category,
      text: purchaseRequests.text,
      quantity: purchaseRequests.quantity,
      unit: purchaseRequests.unit,
      city: purchaseRequests.city,
      district: purchaseRequests.district,
      deadline: purchaseRequests.deadline,
      needsDelivery: purchaseRequests.needsDelivery,
      status: purchaseRequests.status,
      createdAt: purchaseRequests.createdAt,
      buyerId: purchaseRequests.buyerId,
    })
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.status, OPEN), ne(purchaseRequests.buyerId, userId)))
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(100);

  const matched = open.flatMap((row) => {
    const shop = points.find((point) => pointMatchesRequest(point, { category: row.category, oblast: row.city }));
    return shop ? [{ row, shopId: shop.id }] : [];
  });
  if (!matched.length) return [];

  const buyerIds = [...new Set(matched.map((item) => item.row.buyerId))];
  const people = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, buyerIds));
  const names = new Map(people.map((person) => [person.id, holdPersonName(person.name)]));
  return matched.slice(0, 50).map((item) =>
    toRow(item.row, { buyerName: names.get(item.row.buyerId) ?? "", shopId: item.shopId }),
  );
}

export async function openPurchaseChat(userId: string, requestId: string): Promise<{ id: string } | Fail> {
  await closeExpiredPurchaseRequests();
  const db = getDb();
  const found = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, requestId)).limit(1);
  const row = found[0];
  if (!row) return { error: "not-found", status: 404 };
  if (row.buyerId === userId) return { error: "own", status: 403 };
  if (row.status !== OPEN) return { error: "closed", status: 409 };

  const hits = (await matchingShops(row.category, row.city)).filter((shop) => shop.ownerId === userId);
  const shop = hits.find((item) => item.category === row.category) ?? hits[0];
  if (!shop) return { error: "forbidden", status: 403 };
  return openRequestThread(userId, { requestId: row.id, shopId: shop.id, buyerId: row.buyerId });
}
