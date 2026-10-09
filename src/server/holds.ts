import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { holdPersonName } from "@/lib/public-name";
import { getDb } from "./db";
import { blocks, listings, notifications, reservations, shops, users } from "./db/schema";

const OPEN = ["requested", "confirmed"] as const;

export type HoldStatus = "requested" | "confirmed" | "released" | "expired" | "cancelled";

export type HoldView = {
  id: string;
  listingId: string;
  status: HoldStatus;
  createdAt: string;
};

export type IncomingHold = HoldView & {
  listingTitle: string;
  buyerName: string;
};

type Fail = { error: string; status: number };

function asStatus(value: string): HoldStatus {
  if (value === "requested" || value === "confirmed" || value === "released" || value === "expired" || value === "cancelled") {
    return value;
  }
  return "cancelled";
}

function toView(row: { id: string; listingId: string; status: string; createdAt: Date }): HoldView {
  return {
    id: row.id,
    listingId: row.listingId,
    status: asStatus(row.status),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Ask the seller to set a listing aside.
 * One open row (requested or confirmed) per buyer per listing.
 * hold_until is filled because the existing column is required. It is not a paid window and nothing expires it.
 * No push: devices.fcm_token exists, but there is no Firebase Admin send path.
 */
export async function askHold(buyerId: string, listingId: string): Promise<{ hold: HoldView } | Fail> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        status: listings.status,
        title: listings.title,
        underReview: listings.underReview,
        shopId: listings.shopId,
        section: listings.section,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .for("update")
      .limit(1);
    const listing = locked[0];
    if (!listing || listing.status === "hidden" || listing.underReview) return { error: "not-found", status: 404 };
    if (listing.shopId) {
      const shop = await tx
        .select({ underReview: shops.underReview })
        .from(shops)
        .where(eq(shops.id, listing.shopId))
        .limit(1);
      if (shop[0]?.underReview) return { error: "not-found", status: 404 };
    }
    // Services are booked through the chat («Записаться»), never held.
    if (listing.section === "services") return { error: "service", status: 409 };
    if (listing.ownerId === buyerId) return { error: "own", status: 403 };
    if (listing.status !== "active" && listing.status !== "promoted") return { error: "closed", status: 409 };

    const blocked = await tx
      .select({ blockerId: blocks.blockerId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, listing.ownerId), eq(blocks.blockedUserId, buyerId)),
          and(eq(blocks.blockerId, buyerId), eq(blocks.blockedUserId, listing.ownerId)),
        ),
      )
      .limit(1);
    if (blocked[0]) return { error: "blocked", status: 403 };

    const open = await tx
      .select()
      .from(reservations)
      .where(
        and(eq(reservations.listingId, listingId), eq(reservations.buyerId, buyerId), inArray(reservations.status, [...OPEN])),
      )
      .limit(1);
    if (open[0]) return { hold: toView(open[0]) };

    const buyer = await tx.select({ name: users.name }).from(users).where(eq(users.id, buyerId)).limit(1);
    const now = new Date();
    const inserted = await tx
      .insert(reservations)
      .values({
        listingId,
        buyerId,
        holdUntil: now,
        status: "requested",
        createdAt: now,
      })
      .returning();
    const row = inserted[0];
    if (!row) return { error: "save", status: 500 };

    await tx.insert(notifications).values({
      userId: listing.ownerId,
      type: "hold_asked",
      listingId,
      textKey: "notifHoldAsked",
      params: { name: holdPersonName(buyer[0]?.name), title: listing.title },
    });
    return { hold: toView(row) };
  });
}

export async function buyerHold(buyerId: string, listingId: string): Promise<HoldView | null> {
  const rows = await getDb()
    .select()
    .from(reservations)
    .where(and(eq(reservations.listingId, listingId), eq(reservations.buyerId, buyerId)))
    .orderBy(desc(reservations.createdAt))
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function incomingHolds(sellerId: string): Promise<IncomingHold[]> {
  const rows = await getDb()
    .select({
      id: reservations.id,
      listingId: reservations.listingId,
      buyerId: reservations.buyerId,
      status: reservations.status,
      createdAt: reservations.createdAt,
      title: listings.title,
      buyerName: users.name,
    })
    .from(reservations)
    .innerJoin(listings, eq(listings.id, reservations.listingId))
    .innerJoin(users, eq(users.id, reservations.buyerId))
    .where(
      and(
        eq(listings.ownerId, sellerId),
        ne(listings.status, "hidden"),
        inArray(reservations.status, ["requested", "confirmed", "cancelled"]),
      ),
    )
    .orderBy(desc(reservations.createdAt))
    .limit(40);

  const seen = new Set<string>();
  const latest: IncomingHold[] = [];
  for (const row of rows) {
    const key = `${row.listingId}:${row.buyerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      ...toView(row),
      listingTitle: row.title,
      buyerName: holdPersonName(row.buyerName),
    });
  }
  return latest.sort((a, b) => {
    const rank = (status: string) => (status === "requested" ? 0 : 1);
    const byRank = rank(a.status) - rank(b.status);
    if (byRank !== 0) return byRank;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function answerHold(
  sellerId: string,
  holdId: string,
  action: "confirm" | "decline",
): Promise<{ hold: IncomingHold } | Fail> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx.select().from(reservations).where(eq(reservations.id, holdId)).for("update").limit(1);
    const hold = locked[0];
    if (!hold) return { error: "not-found", status: 404 };
    const listingRows = await tx
      .select({ id: listings.id, ownerId: listings.ownerId, title: listings.title })
      .from(listings)
      .where(eq(listings.id, hold.listingId))
      .limit(1);
    const listing = listingRows[0];
    if (!listing || listing.ownerId !== sellerId) return { error: "forbidden", status: 403 };

    const buyer = await tx.select({ name: users.name }).from(users).where(eq(users.id, hold.buyerId)).limit(1);
    const buyerName = holdPersonName(buyer[0]?.name);
    const current: IncomingHold = {
      ...toView(hold),
      listingTitle: listing.title,
      buyerName,
    };
    if (hold.status !== "requested") return { hold: current };

    const now = new Date();
    const status = action === "confirm" ? "confirmed" : "cancelled";
    await tx
      .update(reservations)
      .set({ status, confirmedAt: action === "confirm" ? now : null })
      .where(eq(reservations.id, holdId));
    await tx.insert(notifications).values({
      userId: hold.buyerId,
      type: "hold_answered",
      listingId: hold.listingId,
      textKey: action === "confirm" ? "notifHoldYes" : "notifHoldNo",
      params: { title: listing.title },
    });
    return { hold: { ...current, status } };
  });
}
