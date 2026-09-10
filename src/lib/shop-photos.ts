import type { Shop, ShopKind, ShopProduct } from "./types";

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

function bytesFromDataUrl(src: string, maxChars = 48_000): Uint8Array | null {
  const comma = src.indexOf(",");
  if (comma < 0) return null;
  try {
    const binary = atob(src.slice(comma + 1, comma + 1 + maxChars));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function jpegSizeFromDataUrl(src: string): { width: number; height: number } | null {
  if (!/^data:image\/jpe?g/i.test(src)) return null;
  const bytes = bytesFromDataUrl(src);
  if (!bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
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

export function pngSizeFromDataUrl(src: string): { width: number; height: number } | null {
  if (!/^data:image\/png/i.test(src)) return null;
  const bytes = bytesFromDataUrl(src, 512);
  if (!bytes || bytes.length < 24) return null;
  for (let i = 0; i <= bytes.length - 24; i++) {
    if (bytes[i] !== 0x49 || bytes[i + 1] !== 0x48 || bytes[i + 2] !== 0x44 || bytes[i + 3] !== 0x52) continue;
    const width = ((bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7]) >>> 0;
    const height = ((bytes[i + 8] << 24) | (bytes[i + 9] << 16) | (bytes[i + 10] << 8) | bytes[i + 11]) >>> 0;
    if (width > 0 && height > 0 && width < 20000 && height < 20000) return { width, height };
  }
  return null;
}

export function imageSizeFromDataUrl(src?: string): { width: number; height: number } | null {
  if (!src) return null;
  return jpegSizeFromDataUrl(src) || pngSizeFromDataUrl(src);
}

function isPriceTagCanvasSize(width: number, height: number): boolean {
  const ratio = width / Math.max(height, 1);
  const nearDemo = Math.abs(width - 640) <= 32 && Math.abs(height - 800) <= 32;
  const fourByFive = ratio >= 0.78 && ratio <= 0.82 && width >= 480 && width <= 720 && height >= 600 && height <= 900;
  return nearDemo || fourByFive;
}

/** Demo AI price tag is a ~640×800 seven-segment canvas, not a product photo. */
export function isGeneratedPriceTag(src?: string): boolean {
  if (!src?.startsWith("data:image")) return false;
  const size = imageSizeFromDataUrl(src);
  return Boolean(size && isPriceTagCanvasSize(size.width, size.height));
}

/**
 * Camera stills of the demo tag are often 4:3 VGA JPEGs (~12KB). Real product
 * photos from the in-app camera are much larger after jpegDataUrl(900).
 * Only used when the title already maps to a stock item photo.
 */
export function isCompactPriceTagDataUrl(src?: string, title?: string, kind?: ShopKind): boolean {
  if (!src?.startsWith("data:image") || isStockShopPhoto(src)) return false;
  if (!photoForProductTitle(title, kind)) return false;
  if (isGeneratedPriceTag(src)) return true;
  if (src.length >= 28_000) return false;
  const size = imageSizeFromDataUrl(src);
  if (!size) return src.length < 16_000;
  return size.width >= 160 && size.height >= 160;
}

function isPriceTagPhoto(src?: string, title?: string, kind?: ShopKind): boolean {
  return isGeneratedPriceTag(src) || isCompactPriceTagDataUrl(src, title, kind);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function isCream(r: number, g: number, b: number) {
  return r >= 200 && g >= 188 && b >= 168 && r >= g - 8 && g >= b - 12 && r - b >= 8;
}

function isPaper(r: number, g: number, b: number) {
  return r > 228 && g > 228 && b > 214;
}

function isInk(r: number, g: number, b: number) {
  return r < 110 && g < 105 && b < 100 && r + g + b < 280;
}

/** Close-up of the demo (or similar) price tag: flat cream/white card, dark digits. */
export async function looksLikeRenderedPriceTag(src?: string): Promise<boolean> {
  if (!src?.startsWith("data:image")) return false;
  if (isGeneratedPriceTag(src)) return true;
  if (typeof document === "undefined") return false;
  try {
    const img = await loadImage(src);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (isPriceTagCanvasSize(width, height)) return true;
    const canvas = document.createElement("canvas");
    const w = 40;
    const h = 50;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let cream = 0;
    let paper = 0;
    let inkCenter = 0;
    let creamBorder = 0;
    let paperCenter = 0;
    const colors = new Set<number>();
    const n = w * h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
        const onBorder = x < 6 || x >= w - 6 || y < 6 || y >= h - 6;
        const onCenter = x >= 8 && x < w - 8 && y >= 10 && y < h - 12;
        if (isCream(r, g, b)) {
          cream += 1;
          if (onBorder) creamBorder += 1;
        }
        if (isPaper(r, g, b)) {
          paper += 1;
          if (onCenter) paperCenter += 1;
        }
        if (onCenter && isInk(r, g, b)) inkCenter += 1;
      }
    }
    const flat = colors.size <= 28;
    const demoLayout = cream / n > 0.12 && paper / n > 0.08 && inkCenter > 4 && creamBorder > 10 && paperCenter > 8;
    const whiteCard = paper / n > 0.22 && inkCenter > 5 && flat;
    return demoLayout || whiteCard;
  } catch {
    return false;
  }
}

export function photoForProductTitle(title?: string, kind?: ShopKind): string | undefined {
  const name = title?.trim() ?? "";
  for (const row of TITLE_PHOTOS) {
    if (name && row.re.test(name)) return row.src;
  }
  if (kind && KIND_PHOTOS[kind]) return KIND_PHOTOS[kind];
  return undefined;
}

function usablePhoto(src?: string, title?: string, kind?: ShopKind): string | undefined {
  if (!src || isPriceTagPhoto(src, title, kind)) return undefined;
  return src;
}

export function displayPhotoForProduct(
  product: Pick<ShopProduct, "title" | "kind" | "photo">,
  fallback?: string,
): string {
  const stock = photoForProductTitle(product.title, product.kind);
  if (!product.photo || isPriceTagPhoto(product.photo, product.title, product.kind)) {
    return stock || usablePhoto(fallback, product.title, product.kind) || SHOP_ITEM_PHOTOS.bakery;
  }
  return product.photo;
}

export async function replacePriceTagPhoto(
  product: Pick<ShopProduct, "title" | "kind" | "photo">,
): Promise<string | undefined> {
  const shown = displayPhotoForProduct(product);
  if (!product.photo) return shown;
  if (shown !== product.photo) return shown;
  if (isStockShopPhoto(product.photo) || !product.photo.startsWith("data:image")) return product.photo;
  if (await looksLikeRenderedPriceTag(product.photo)) {
    return photoForProductTitle(product.title, product.kind) || SHOP_ITEM_PHOTOS.bakery;
  }
  return product.photo;
}

export async function sweepShopPriceTagPhotos<T extends Pick<Shop, "products">>(shop: T): Promise<{ shop: T; changed: boolean }> {
  const products = shop.products ?? [];
  const next = [];
  let changed = false;
  for (const item of products) {
    const photo = await replacePriceTagPhoto(item);
    if (photo !== item.photo) {
      changed = true;
      next.push({ ...item, photo });
    } else {
      next.push(item);
    }
  }
  return changed ? { shop: { ...shop, products: next }, changed } : { shop, changed: false };
}
