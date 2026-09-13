import { listingHasPrice } from "./deal";
import { displayPhotoForProduct } from "./shop-photos";
import { listingSectionForShop } from "./shops";
import type { AuthMethod, Listing, ListingStatus, Shop, ShopProduct, User } from "./types";

export function listingIdForProduct(productId: string): string {
  return `shop-item-${productId}`;
}

export function postedAgoFrom(iso?: string, now = Date.now()): string {
  if (!iso) return "now";
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "now";
  if (h < 3) return "2h";
  if (h < 4) return "3h";
  if (h < 5) return "4h";
  if (h < 7) return "6h";
  if (h < 8) return "7h";
  if (h < 9) return "8h";
  if (h < 12) return "9h";
  if (h < 20) return "12h";
  if (h < 36) return "1d";
  if (h < 60) return "2d";
  if (h < 96) return "3d";
  return "5d";
}

function listingStatusForProduct(shop: Shop, product: ShopProduct, prev?: Listing): ListingStatus {
  if (product.published === false) return "withdrawn";
  if (shop.status === "withdrawn") return "withdrawn";
  if (prev?.status === "reserved" || prev?.status === "promoted" || prev?.status === "closed") return prev.status;
  return "active";
}

export function listingFromShopProduct(shop: Shop, product: ShopProduct, user: User | null, prev?: Listing): Listing {
  const mapped = listingSectionForShop(product.category || shop.category, product.kind);
  const price = product.price && product.price > 0 ? product.price : 0;
  const had = prev && listingHasPrice(prev) ? prev.price : 0;
  const fromPromo =
    product.previousPrice != null && product.previousPrice > 0 && price > 0 && product.previousPrice > price
      ? product.previousPrice
      : undefined;
  const previousPrice =
    fromPromo ??
    (had > 0 && price > 0 && price < had ? had : price > 0 && prev?.previousPrice && prev.previousPrice > price ? prev.previousPrice : undefined);
  const promoPercent =
    product.promoPercent != null && product.promoPercent > 0
      ? product.promoPercent
      : previousPrice && price > 0 && previousPrice > price
        ? Math.round((1 - price / previousPrice) * 100)
        : undefined;
  const photo = displayPhotoForProduct(product, shop.coverUrl || "/sections/shops.jpg");
  const id = prev?.id || product.listingId || listingIdForProduct(product.id);
  return {
    id,
    section: mapped.section,
    category: mapped.category,
    title: product.title,
    titleKy: product.title,
    titleEn: product.title,
    price,
    previousPrice,
    promoPercent,
    city: shop.city === "all" ? "bishkek" : shop.city,
    postedAgo: postedAgoFrom(product.createdAt),
    postedAt: product.createdAt,
    photos: [photo],
    photoCredit: shop.name,
    description: product.description || product.title,
    descriptionKy: product.description || product.title,
    descriptionEn: product.description || product.title,
    ownerId: prev?.ownerId || "aida",
    sellerName: shop.name,
    sellerMethod: user?.method ?? prev?.sellerMethod,
    sellerCardLinked: user?.cardLinked ?? prev?.sellerCardLinked,
    shopId: shop.id,
    shopProductId: product.id,
    hasPhoto: photo !== "/sections/shops.jpg" || Boolean(product.photo || shop.coverUrl),
    verified: Boolean(shop.aiConfirmed),
    noAgent: false,
    status: listingStatusForProduct(shop, product, prev),
    safetyKind: "goods",
    mapX: prev?.mapX ?? 40,
    mapY: prev?.mapY ?? 40,
    contact: shop.contacts.telegram ? "telegram" : "whatsapp",
    views: prev?.views ?? 0,
    favCount: prev?.favCount ?? 0,
    lat: shop.lat,
    lng: shop.lng,
    mediaKind: product.videoUrl ? "video" : "photos",
    videoUrl: product.videoUrl,
    reservedBy: prev?.reservedBy,
  };
}

export function syncProductListing(extra: Listing[], shop: Shop, product: ShopProduct, user: User | null): Listing[] {
  const id = product.listingId || listingIdForProduct(product.id);
  const prev = extra.find((item) => item.id === id || item.shopProductId === product.id);
  const listing = listingFromShopProduct(shop, { ...product, listingId: id }, user, prev);
  if (extra.some((item) => item.id === listing.id)) {
    return extra.map((item) => (item.id === listing.id ? listing : item));
  }
  return [listing, ...extra];
}

export function syncShopListings(extra: Listing[], shops: Shop[], user: User | null): Listing[] {
  let next = extra;
  for (const shop of shops) {
    for (const product of shop.products) {
      next = syncProductListing(next, shop, product, user);
    }
  }
  return next;
}

export function sellerNameOf(listing: Listing, shop?: Shop | null): string | undefined {
  return listing.sellerName || shop?.name || shop?.ownerName;
}

export function sellerMethodOf(listing: Listing): { method?: AuthMethod; cardLinked?: boolean } {
  return { method: listing.sellerMethod, cardLinked: listing.sellerCardLinked };
}
