import { postedAgoFrom } from "@/lib/shop-listing";
import { telegramUsername } from "@/lib/telegram-username";
import type { AuthMethod, Listing, Shop, ShopProduct, User } from "@/lib/types";
import type { SessionUser } from "./auth";
import type { listings, shops } from "./db/schema";

type ListingRow = typeof listings.$inferSelect;
type ShopRow = typeof shops.$inferSelect;

const LISTING_STATUSES = new Set(["active", "promoted", "reserved", "closed", "withdrawn", "expired", "hidden"]);

export function publicUser(user: SessionUser): User {
  const method = user.method as AuthMethod | "demo";
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? "",
    email: user.email ?? undefined,
    method: method === "demo" ? undefined : (method as AuthMethod),
    joinedYear: user.createdAt.getFullYear(),
    verified: user.method === "sms",
    rating: 0,
    views: 0,
    linkedChannels: [],
    cardLinked: false,
    roles: user.isAdmin ? ["admin"] : undefined,
  };
}

export function sessionAsUser(user: SessionUser): User {
  return {
    ...publicUser(user),
    method: (user.method === "demo" ? undefined : user.method) as AuthMethod | undefined,
  };
}

function num(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function rowToListing(row: ListingRow): Listing {
  const attrs = (row.attrs ?? {}) as Partial<Listing> & { sellerPhone?: string };
  const { sellerPhone: _omit, ...rest } = attrs;
  const price = row.price == null ? 0 : Number(row.price);
  const created = row.createdAt instanceof Date ? row.createdAt.toISOString() : undefined;
  return {
    titleKy: row.title,
    titleEn: row.title,
    descriptionKy: row.description,
    descriptionEn: row.description,
    photoCredit: "",
    verified: false,
    noAgent: false,
    safetyKind: "goods",
    mapX: 40,
    mapY: 40,
    contact: "whatsapp",
    favCount: 0,
    postedAgo: postedAgoFrom(created),
    ...rest,
    id: row.id,
    ownerId: row.ownerId,
    section: row.section as Listing["section"],
    category: row.category ?? rest.category,
    goodsKind: row.subcategory ?? rest.goodsKind,
    title: row.title,
    description: row.description,
    price,
    previousPrice: num(row.oldPrice) ?? rest.previousPrice,
    promoPercent: row.promoPercent ?? rest.promoPercent,
    unit: (row.unit as Listing["unit"]) ?? rest.unit,
    city: row.city,
    district: row.district ?? rest.district,
    settlement: row.settlement ?? rest.settlement,
    lat: row.lat ?? rest.lat,
    lng: row.lng ?? rest.lng,
    photos: row.photos?.length ? row.photos : rest.photos ?? [],
    videoUrl: row.videoUrl ?? rest.videoUrl,
    voiceUrl: row.voiceUrl ?? rest.voiceUrl,
    voiceSec: row.voiceSec ?? rest.voiceSec,
    hasPhoto: row.hasPhoto,
    shopId: row.shopId ?? rest.shopId,
    shopProductId: row.shopProductId ?? rest.shopProductId,
    status: (LISTING_STATUSES.has(row.status) ? row.status : "active") as Listing["status"],
    underReview: row.underReview === true,
    views: row.views ?? 0,
    postedAt: created ?? rest.postedAt,
    confirmedAt: row.lastConfirmedAt instanceof Date ? row.lastConfirmedAt.toISOString() : rest.confirmedAt,
  };
}

export function listingCounts(row: ListingRow): { likes: number; dislikes: number } {
  return { likes: row.likes ?? 0, dislikes: row.dislikes ?? 0 };
}

export function listingToRow(
  listing: Listing,
  ownerId: string,
  extra?: { videoSec?: number | null },
): typeof listings.$inferInsert {
  const price = listing.price > 0 ? Math.round(listing.price) : null;
  const status = LISTING_STATUSES.has(listing.status) ? listing.status : "active";
  const attrs = JSON.parse(JSON.stringify(listing)) as Record<string, unknown>;
  delete attrs.sellerPhone;
  return {
    id: listing.id,
    ownerId,
    shopId: listing.shopId ?? null,
    shopProductId: listing.shopProductId ?? null,
    section: listing.section,
    category: listing.category ?? null,
    subcategory: listing.goodsKind ?? listing.realtyKind ?? null,
    attrs,
    title: listing.title || "",
    description: listing.description || "",
    origLang: null,
    price,
    priceType: price == null ? "negotiable" : "fixed",
    unit: listing.unit ?? null,
    oldPrice: listing.previousPrice != null && listing.previousPrice > 0 ? Math.round(listing.previousPrice) : null,
    promoPercent: listing.promoPercent ?? null,
    status,
    soldAt: status === "closed" ? new Date() : null,
    oblast: null,
    city: listing.city || "",
    district: listing.district ?? null,
    settlement: listing.settlement ?? null,
    lat: listing.lat ?? null,
    lng: listing.lng ?? null,
    hasVideo: Boolean(listing.videoUrl),
    hasPhoto: Boolean(listing.hasPhoto || listing.photos?.length),
    videoUrl: listing.videoUrl ?? null,
    ...(extra?.videoSec != null ? { videoSec: Math.round(extra.videoSec) } : {}),
    voiceUrl: listing.voiceUrl ?? null,
    voiceSec: listing.voiceSec ?? null,
    coverUrl: listing.videoUrl ? listing.photos?.[0] ?? null : listing.photos?.[0] ?? null,
    photos: listing.photos ?? [],
    updatedAt: new Date(),
  };
}

export function isListingStatus(value: string): boolean {
  return LISTING_STATUSES.has(value);
}

export function shopToColumns(shop: Shop, ownerId: string): typeof shops.$inferInsert {
  const kind = shop.kinds?.[0] ?? null;
  return {
    id: shop.id,
    ownerId,
    name: shop.name ?? "",
    group: shop.category || "other",
    kind,
    kindOther: shop.kindOther ?? null,
    city: shop.city || "",
    district: shop.district ?? null,
    landmarks: shop.landmarks?.length ? shop.landmarks : shop.address ? [shop.address] : [],
    lat: shop.lat ?? null,
    lng: shop.lng ?? null,
    hours: shop.hours ?? null,
    photoUrl: shop.coverUrl ?? null,
    hasDelivery: Boolean(shop.delivery),
    deliveryFree: shop.delivery ? (shop.deliveryFree ?? null) : null,
    deliveryDistricts: shop.delivery ? (shop.deliveryDistricts ?? []) : [],
    phone: shop.contacts?.phone ?? null,
    whatsapp: shop.contacts?.whatsapp ? shop.contacts.phone || "1" : null,
    telegram: telegramUsername(shop.telegramUsername) ?? (shop.contacts?.telegram ? "1" : null),
    status: shop.status || "draft",
    lastPostedAt: shop.products?.some((item) => item.published !== false) ? new Date() : null,
    updatedAt: new Date(),
    doc: JSON.parse(JSON.stringify(shop)) as Shop,
  };
}

export function rowToShop(row: ShopRow): Shop {
  const doc = row.doc as Shop;
  const handle = telegramUsername(row.telegram);
  return {
    ...doc,
    id: row.id,
    ownerId: row.ownerId,
    telegramUsername: handle ?? undefined,
    status: (row.status as Shop["status"]) || doc.status,
    underReview: row.underReview === true,
    name: doc.name ?? row.name,
    city: doc.city || row.city,
    district: doc.district || row.district || undefined,
    kindOther: doc.kindOther || row.kindOther || undefined,
    deliveryFree: typeof doc.deliveryFree === "boolean" ? doc.deliveryFree : typeof row.deliveryFree === "boolean" ? row.deliveryFree : undefined,
    deliveryDistricts: doc.deliveryDistricts?.length ? doc.deliveryDistricts : row.deliveryDistricts?.length ? [...row.deliveryDistricts] : doc.deliveryDistricts,
    products: Array.isArray(doc.products) ? doc.products : [],
  };
}

export function shopProduct(shop: Shop, productId: string): ShopProduct | undefined {
  return shop.products.find((item) => item.id === productId);
}

const MEDIA_PREFIX = () => process.env.MEDIA_URL_PREFIX || "/media";

export function mediaUrlError(urls: Array<string | null | undefined>): string | null {
  const prefix = MEDIA_PREFIX();
  for (const url of urls) {
    if (!url) continue;
    if (url.startsWith("data:") || url.startsWith("blob:")) return "media-not-uploaded";
    if (url.startsWith(`${prefix}/`)) continue;
    if (url.startsWith("/") && !url.startsWith("//")) continue;
    if (url.startsWith("https://")) continue;
    return "media-not-uploaded";
  }
  return null;
}

export function listingMediaUrls(listing: Listing): string[] {
  return [listing.videoUrl, listing.voiceUrl, ...(listing.photos ?? [])].filter((url): url is string => Boolean(url));
}

export function shopMediaUrls(shop: Shop): string[] {
  const urls = [shop.coverUrl, shop.videoUrl];
  for (const product of shop.products ?? []) urls.push(product.photo, product.videoUrl);
  return urls.filter((url): url is string => Boolean(url));
}
