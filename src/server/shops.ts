import { and, eq } from "drizzle-orm";
import { listingCategoryError } from "@/lib/listing-rules";
import { listingFromShopProduct, listingIdForProduct } from "@/lib/shop-listing";
import { canMutate, mediaError, productErrors, publishErrors, reuseErrors, type ShopAction } from "@/lib/shop-rules";
import { listingSectionForShop } from "@/lib/shops";
import type { Shop, ShopCategory, ShopKind, ShopProduct, User } from "@/lib/types";
import type { SessionUser } from "./auth";
import { getDb } from "./db";
import { listings, shops } from "./db/schema";
import { attachMedia } from "./media";
import { listingMediaUrls, listingToRow, rowToListing, sessionAsUser, shopMediaUrls, shopToColumns } from "./mappers";

function productCreatesPharmacyListing(
  product: { kind?: string | null; category?: string | null },
  shop: Shop,
): boolean {
  const mapped = listingSectionForShop(
    (product.category || shop.category) as ShopCategory,
    product.kind as ShopKind | undefined,
  );
  return listingCategoryError({ section: mapped.section, category: mapped.category }, shop.kinds ?? []) === "pharmacy-only";
}

export type ShopBody = {
  action?: ShopAction;
  shop?: Shop;
  ownerPhone?: string;
  ownerName?: string;
  product?: Partial<ShopProduct>;
  videoBytes?: number;
  videoSeconds?: number;
};

export function validateShopAction(
  body: ShopBody,
  user: User,
): { status: number; body: { ok: false; error: string; errors?: string[] } } | null {
  if (!body.shop) return { status: 400, body: { ok: false, error: "bad-json" } };
  const media = mediaError(body.videoBytes, body.videoSeconds);
  if (media) return { status: 400, body: { ok: false, error: media } };
  const products: Array<{ kind?: string | null; category?: string | null }> = [
    ...(body.shop.products ?? []),
    ...(body.product ? [body.product] : []),
  ];
  if (products.some((product) => productCreatesPharmacyListing(product, body.shop as Shop))) {
    return { status: 400, body: { ok: false, error: "pharmacy-only" } };
  }
  const action = body.action as ShopAction;
  if (action === "upsert-product" && body.product) {
    const errs = productErrors(body.product);
    if (!body.shop.products.some((row) => row.id === body.product?.id)) {
      errs.push(...reuseErrors(body.shop, body.product.sourceId));
    }
    if (errs.length) return { status: 400, body: { ok: false, error: errs[0], errors: errs } };
  }
  const gate = canMutate(body.shop, user, action);
  if (gate) {
    const extra = action === "publish" ? publishErrors(body.shop) : [];
    return { status: 400, body: { ok: false, error: gate, errors: extra.length ? extra : [gate] } };
  }
  return null;
}

async function syncProductListings(user: SessionUser, shop: Shop) {
  const db = getDb();
  const existing = await db.select().from(listings).where(eq(listings.shopId, shop.id));
  const keep = new Set<string>();
  const clientUser = sessionAsUser(user);
  clientUser.name = user.name || shop.ownerName;
  clientUser.phone = user.phone || shop.ownerPhone;
  for (const product of shop.products ?? []) {
    const id = product.listingId || listingIdForProduct(product.id);
    const prevRow = existing.find((row) => row.id === id || row.shopProductId === product.id);
    const prev = prevRow ? rowToListing(prevRow) : undefined;
    const listing = listingFromShopProduct(shop, { ...product, listingId: id }, clientUser, prev);
    if (listingCategoryError(listing, shop.kinds ?? []) != null) continue;
    keep.add(id);
    listing.ownerId = user.id;
    listing.id = prevRow?.id || id;
    keep.add(listing.id);
    const row = listingToRow(listing, user.id);
    if (prevRow) {
      await db.update(listings).set(row).where(eq(listings.id, prevRow.id));
    } else {
      await db.insert(listings).values(row).onConflictDoNothing();
    }
    await attachMedia(user.id, listingMediaUrls(listing), { listingId: listing.id });
  }
  for (const row of existing) {
    if (keep.has(row.id)) continue;
    await db.update(listings).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(listings.id, row.id));
  }
}

export async function saveShopForUser(user: SessionUser, shop: Shop): Promise<{ shop: Shop } | { error: string; status: number }> {
  const db = getDb();
  const existing = await db.select().from(shops).where(eq(shops.id, shop.id)).limit(1);
  if (existing[0] && existing[0].ownerId !== user.id) return { error: "forbidden", status: 403 };
  const columns = shopToColumns({ ...shop, id: shop.id }, user.id);
  if (!existing[0]) {
    await db.insert(shops).values(columns);
  } else {
    await db.update(shops).set(columns).where(and(eq(shops.id, shop.id), eq(shops.ownerId, user.id)));
  }
  await syncProductListings(user, shop);
  await attachMedia(user.id, shopMediaUrls(shop), { shopId: shop.id });
  return { shop };
}
