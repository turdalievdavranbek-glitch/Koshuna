import type { ShopKind, ShopProduct } from "./types";

export const SHOP_ITEM_PHOTOS = {
  baton: "/shops/items/baton.jpg",
  lepyoshka: "/shops/items/lepyoshka.jpg",
  naan: "/shops/items/naan.jpg",
  flour: "/shops/items/flour.jpg",
  bakery: "/shops/items/bakery.jpg",
} as const;

const TITLE_PHOTOS: Array<{ re: RegExp; src: string }> = [
  { re: /батон|baton|loaf/i, src: SHOP_ITEM_PHOTOS.baton },
  { re: /леп[её]шк|lepyosh|lavash|лаваш/i, src: SHOP_ITEM_PHOTOS.lepyoshka },
  { re: /наан|naan/i, src: SHOP_ITEM_PHOTOS.naan },
  { re: /мука|flour|\bун\b/i, src: SHOP_ITEM_PHOTOS.flour },
];

const KIND_PHOTOS: Partial<Record<ShopKind, string>> = {
  "food-bakery": SHOP_ITEM_PHOTOS.bakery,
};

export function isStockShopPhoto(src?: string): boolean {
  if (!src) return false;
  return src.startsWith("/shops/items/");
}

export function jpegSizeFromDataUrl(src: string): { width: number; height: number } | null {
  if (!src.startsWith("data:image/jpeg")) return null;
  const comma = src.indexOf(",");
  if (comma < 0) return null;
  let binary: string;
  try {
    binary = atob(src.slice(comma + 1, comma + 1 + 6000));
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height };
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}

/** Demo AI price tag is a 640×800 seven-segment canvas, not a product photo. */
export function isGeneratedPriceTag(src?: string): boolean {
  if (!src) return false;
  const size = jpegSizeFromDataUrl(src);
  return Boolean(size && size.width === 640 && size.height === 800);
}

export function photoForProductTitle(title?: string, kind?: ShopKind): string | undefined {
  const name = title?.trim() ?? "";
  for (const row of TITLE_PHOTOS) {
    if (name && row.re.test(name)) return row.src;
  }
  if (kind && KIND_PHOTOS[kind]) return KIND_PHOTOS[kind];
  return undefined;
}

export function displayPhotoForProduct(
  product: Pick<ShopProduct, "title" | "kind" | "photo">,
  fallback?: string,
): string {
  const stock = photoForProductTitle(product.title, product.kind);
  if (!product.photo || isGeneratedPriceTag(product.photo)) {
    return stock || fallback || SHOP_ITEM_PHOTOS.bakery;
  }
  return product.photo;
}
