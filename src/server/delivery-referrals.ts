import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { orders, referralAttributions, referralCodes, referralRewards, shops } from "./db/schema";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

const CLIENT_OFF = 30;
const COURIER_BONUS = 200;
const COURIER_DELIVERIES = 10;
const SHOP_FREE_MS = 7 * 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://koshuna.ru";
  return raw.replace(/\/$/, "");
}

export function referralLink(code: string): { url: string; whatsapp: string } {
  const url = `${siteOrigin()}/?ref=${encodeURIComponent(code)}`;
  const text = `Коңшу — доставка от соседей. ${url}`;
  return { url, whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}` };
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const db = getDb();
  const existing = await db.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing[0]) return existing[0].code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
    try {
      await db.insert(referralCodes).values({ userId, code });
      return code;
    } catch {
      const again = await db.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
      if (again[0]) return again[0].code;
    }
  }
  throw new Error("referral-code");
}

/** Attach a code once. Self-invites and a second inviter are ignored. */
export async function claimReferral(userId: string, raw: string): Promise<{ ok: true } | { error: string }> {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return { error: "bad-code" };
  const db = getDb();
  const owner = await db.select({ userId: referralCodes.userId }).from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  if (!owner[0] || owner[0].userId === userId) return { error: "bad-code" };
  const already = await db.select({ referredId: referralAttributions.referredId }).from(referralAttributions).where(eq(referralAttributions.referredId, userId)).limit(1);
  if (already[0]) return { ok: true };
  try {
    await db.insert(referralAttributions).values({ referredId: userId, referrerId: owner[0].userId });
  } catch {
    return { ok: true };
  }
  return { ok: true };
}

/** −30 som on the referred client's first order. The ledger row is written after the order exists. */
export async function clientDiscount(tx: Tx, userId: string, feeSom: number): Promise<number> {
  const link = await tx.select({ referrerId: referralAttributions.referrerId }).from(referralAttributions).where(eq(referralAttributions.referredId, userId)).limit(1);
  if (!link[0]) return 0;
  const prior = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.buyerId, userId), sql`${orders.status} not in ('cancelled','rejected')`));
  if (Number(prior[0]?.n ?? 0) > 0) return 0;
  const paid = await tx.select({ id: referralRewards.id }).from(referralRewards).where(and(eq(referralRewards.referredId, userId), eq(referralRewards.kind, "client"))).limit(1);
  if (paid[0]) return 0;
  return Math.min(CLIENT_OFF, Math.max(0, feeSom));
}

export async function rememberClientDiscount(tx: Tx, userId: string, off: number): Promise<void> {
  if (off <= 0) return;
  const link = await tx.select({ referrerId: referralAttributions.referrerId }).from(referralAttributions).where(eq(referralAttributions.referredId, userId)).limit(1);
  if (!link[0]) return;
  await tx
    .insert(referralRewards)
    .values({ referrerId: link[0].referrerId, referredId: userId, kind: "client", amountSom: -off })
    .onConflictDoNothing();
}

/** +200 som to the referrer after the friend's 10th delivery. The ledger stores it; nothing is paid out here. */
export async function rewardCourierReferral(courierId: string): Promise<void> {
  const db = getDb();
  const link = await db.select({ referrerId: referralAttributions.referrerId }).from(referralAttributions).where(eq(referralAttributions.referredId, courierId)).limit(1);
  if (!link[0]) return;
  const done = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.courierId, courierId), eq(orders.status, "delivered")));
  if (Number(done[0]?.n ?? 0) < COURIER_DELIVERIES) return;
  const exists = await db.select({ id: referralRewards.id }).from(referralRewards).where(and(eq(referralRewards.referredId, courierId), eq(referralRewards.kind, "courier"))).limit(1);
  if (exists[0]) return;
  await db.insert(referralRewards).values({
    referrerId: link[0].referrerId,
    referredId: courierId,
    kind: "courier",
    amountSom: COURIER_BONUS,
  }).catch(() => undefined);
}

/** A referred shop gets one week at 0% commission. The week is stored; commission is not charged yet. */
export async function rewardShopReferral(ownerId: string, shopId: string): Promise<void> {
  const db = getDb();
  const link = await db.select({ referrerId: referralAttributions.referrerId }).from(referralAttributions).where(eq(referralAttributions.referredId, ownerId)).limit(1);
  if (!link[0]) return;
  const shop = await db.select({ until: shops.commissionFreeUntil }).from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop[0] || shop[0].until) return;
  const until = new Date(Date.now() + SHOP_FREE_MS);
  await db.update(shops).set({ commissionFreeUntil: until, updatedAt: new Date() }).where(eq(shops.id, shopId));
  await db
    .insert(referralRewards)
    .values({ referrerId: link[0].referrerId, referredId: ownerId, kind: "shop", shopId, amountSom: 0 })
    .catch(() => undefined);
}
