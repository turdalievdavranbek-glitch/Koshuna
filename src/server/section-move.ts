import { eq } from "drizzle-orm";
import { DICT } from "@/lib/i18n";
import { applySectionMove, type SectionMove } from "@/lib/section-move";
import type { Lang, Listing, Shop, ShopProduct } from "@/lib/types";
import { getDb } from "./db";
import { listings, shops, users } from "./db/schema";
import { bindNoticePushes, saveNotice } from "./notices";

function sectionName(lang: Lang, move: SectionMove): string {
  const t = lang === "ky" ? DICT.ky : DICT.ru;
  const section = move.section === "car-rental" ? t.sectionNames.cars : t.sectionNames[move.section] ?? move.section;
  const category = typeof move.category === "string" ? move.category : "";
  const catLabel =
    (category && (t.cats as Record<string, string>)[category]) ||
    (category && (t.shopCats as Record<string, string>)[category]) ||
    (category && (t.shopKinds as Record<string, string>)[category]) ||
    "";
  return catLabel && catLabel !== section ? `${section} › ${catLabel}` : section;
}

/**
 * Admin «Сменить раздел». The listing row (and, for a point item, the product's admin override in the
 * shop doc, so the next point save keeps it) gets the new section and taxonomy. The author gets a notice + push.
 */
export async function moveListingSection(
  adminId: string,
  listingId: string,
  move: SectionMove,
): Promise<{ ok: true } | { error: string; status: number }> {
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  const row = rows[0];
  if (!row) return { error: "not-found", status: 404 };
  const attrs = (row.attrs ?? {}) as Partial<Listing> & Record<string, unknown>;
  const from = { section: row.section, category: row.category ?? null };
  const nextAttrs = applySectionMove({ ...attrs }, move) as Record<string, unknown>;
  nextAttrs.section = move.section;
  const category = typeof move.category === "string" ? move.category : null;
  const sub = typeof move.goodsKind === "string" ? move.goodsKind : typeof move.realtyKind === "string" ? move.realtyKind : null;

  return bindNoticePushes(() =>
    db.transaction(async (tx) => {
      await tx
        .update(listings)
        .set({ section: move.section, category, subcategory: sub, attrs: nextAttrs, updatedAt: new Date() })
        .where(eq(listings.id, listingId));
      if (row.shopId && row.shopProductId) {
        const shopRows = await tx.select().from(shops).where(eq(shops.id, row.shopId)).limit(1);
        const doc = shopRows[0]?.doc as Shop | undefined;
        if (doc?.products?.length) {
          const products = doc.products.map((product: ShopProduct) =>
            product.id === row.shopProductId ? { ...product, adminSection: move } : product,
          );
          await tx.update(shops).set({ doc: { ...doc, products } }).where(eq(shops.id, row.shopId));
        }
      }
      console.info(
        "[audit] section-change",
        JSON.stringify({ at: new Date().toISOString(), admin: adminId, listing: listingId, from, to: { section: move.section, category } }),
      );
      if (row.ownerId !== adminId) {
        const owner = await tx.select({ lang: users.lang }).from(users).where(eq(users.id, row.ownerId)).limit(1);
        const lang: Lang = owner[0]?.lang === "ky" ? "ky" : "ru";
        await saveNotice(tx, {
          userId: row.ownerId,
          type: "listing_section",
          listingId,
          textKey: "notifSectionMoved",
          params: { title: (row.title || "").slice(0, 120), name: sectionName(lang, move).slice(0, 120) },
          actorId: null,
        });
      }
      return { ok: true as const };
    }),
  );
}
