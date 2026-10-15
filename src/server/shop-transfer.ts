import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { normalizePhoneInput } from "@/lib/phone";
import type { Shop } from "@/lib/types";
import { getDb } from "./db";
import { listings, media, shops, users } from "./db/schema";
import { rowToShop, shopMediaUrls, shopToColumns } from "./mappers";
import { bindNoticePushes, saveNotice } from "./notices";

type Target = { id: string; name: string; phone: string | null; email: string | null };

function maskPhone(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `…${digits.slice(-4)}` : "";
}

function maskEmail(email: string | null): string {
  if (!email) return "";
  const [local, host] = email.split("@");
  return host ? `${local.slice(0, 2)}…@${host}` : "";
}

/** True when `userId` owns the point. Checked before any lookup, so others cannot probe accounts. */
export async function ownsShop(userId: string, shopId: string): Promise<"yes" | "no" | "missing"> {
  const rows = await getDb().select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!rows[0]) return "missing";
  return rows[0].ownerId === userId ? "yes" : "no";
}

/** Who is behind a phone or e-mail. Only signed-up, not banned, not deleted accounts. */
export async function findTransferTarget(raw: string): Promise<Target | null> {
  const input = raw.trim();
  if (!input || input.length > 120) return null;
  const db = getDb();
  const live = and(isNull(users.deletedAt), isNull(users.bannedAt));
  if (input.includes("@")) {
    const rows = await db
      .select({ id: users.id, name: users.name, phone: users.phone, email: users.email })
      .from(users)
      .where(and(live, sql`lower(${users.email}) = ${input.toLowerCase()}`))
      .limit(2);
    return rows.length === 1 ? rows[0] : null;
  }
  const phone = normalizePhoneInput(input);
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const rows = await db
    .select({ id: users.id, name: users.name, phone: users.phone, email: users.email })
    .from(users)
    .where(and(live, sql`regexp_replace(coalesce(${users.phone}, ''), '[^0-9]', '', 'g') = ${digits}`))
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}

export function targetLabel(target: Target): string {
  const tail = maskPhone(target.phone) || maskEmail(target.email);
  const name = target.name.trim();
  return [name, tail].filter(Boolean).join(" · ") || tail || "—";
}

/**
 * «Передать точку»: the point and all its items move to `target`. Only the current owner may do it.
 * The managed flag is cleared; if it was set, the seller's phone becomes the point's own phone.
 */
export async function transferShop(
  fromUserId: string,
  fromName: string,
  shopId: string,
  target: Target,
): Promise<{ ok: true } | { error: string; status: number }> {
  if (target.id === fromUserId) return { error: "self", status: 400 };
  const db = getDb();
  const rows = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  const row = rows[0];
  if (!row) return { error: "not-found", status: 404 };
  if (row.ownerId !== fromUserId) return { error: "forbidden", status: 403 };
  const before = rowToShop(row);
  const sellerPhone = before.managedFor?.phone;
  const next: Shop = {
    ...before,
    ownerId: target.id,
    ownerName: target.name || before.ownerName,
    ownerPhone: target.phone || "",
    managedFor: undefined,
    contacts: sellerPhone ? { ...before.contacts, phone: sellerPhone, whatsapp: true } : before.contacts,
    updatedAt: new Date().toISOString(),
  };
  delete next.managedFor;
  const urls = shopMediaUrls(before);

  return bindNoticePushes(() =>
    db.transaction(async (tx) => {
      const columns = shopToColumns(next, target.id);
      await tx.update(shops).set({ ...columns, status: row.status, underReview: row.underReview }).where(and(eq(shops.id, shopId), eq(shops.ownerId, fromUserId)));
      const items = await tx.select({ id: listings.id }).from(listings).where(eq(listings.shopId, shopId));
      await tx
        .update(listings)
        .set({
          ownerId: target.id,
          attrs: sql`(coalesce(${listings.attrs}, '{}'::jsonb) - 'managedPoint') || jsonb_build_object('ownerId', ${target.id}::text)`,
          updatedAt: new Date(),
        })
        .where(eq(listings.shopId, shopId));
      const ids = items.map((item) => item.id);
      const mediaScope = [eq(media.shopId, shopId)];
      if (ids.length) mediaScope.push(inArray(media.listingId, ids));
      if (urls.length) mediaScope.push(inArray(media.url, urls));
      await tx.update(media).set({ ownerId: target.id }).where(and(eq(media.ownerId, fromUserId), or(...mediaScope)));
      console.info(
        "[audit] shop-transfer",
        JSON.stringify({ at: new Date().toISOString(), shop: shopId, from: fromUserId, to: target.id, items: ids.length, wasManaged: Boolean(sellerPhone) }),
      );
      await saveNotice(tx, {
        userId: target.id,
        type: "shop_transfer",
        textKey: "notifShopTransferred",
        params: { title: (before.name || "").slice(0, 120), name: fromName.slice(0, 60) },
        actorId: fromUserId,
      });
      return { ok: true as const };
    }),
  );
}
