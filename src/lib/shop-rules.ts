import { videoLimitError } from "./media-limits";
import { hasShopContact, isOwnShop, isShopCategory, validPrice } from "./shops";
import type { Shop, ShopProduct, User } from "./types";

export type ShopAction = "save-draft" | "publish" | "withdraw" | "upsert-product" | "hide-product";

export type ShopRuleError =
  | "auth"
  | "forbidden"
  | "name"
  | "category"
  | "city"
  | "address"
  | "contact"
  | "confirm"
  | "price"
  | "video-size"
  | "video-duration"
  | "not-found";

export function publishErrors(shop: Shop): ShopRuleError[] {
  const errors: ShopRuleError[] = [];
  if (!shop.name.trim()) errors.push("name");
  if (!isShopCategory(shop.category)) errors.push("category");
  if (!shop.city || shop.city === "all") errors.push("city");
  if (!shop.address.trim()) errors.push("address");
  if (!hasShopContact(shop)) errors.push("contact");
  if (!shop.aiConfirmed) errors.push("confirm");
  return errors;
}

export function productErrors(product: Partial<ShopProduct>): ShopRuleError[] {
  const errors: ShopRuleError[] = [];
  if (!product.title?.trim()) errors.push("name");
  if (product.price != null && product.price !== undefined) {
    if (validPrice(product.price) == null && product.price !== 0) errors.push("price");
    if (product.price < 0) errors.push("price");
  }
  return errors;
}

export function assertOwner(shop: Shop, user: User | null): ShopRuleError | null {
  if (!user) return "auth";
  if (!isOwnShop(shop, user)) return "forbidden";
  return null;
}

export function mediaError(sizeBytes?: number, durationSec?: number): ShopRuleError | null {
  const code = videoLimitError(sizeBytes, durationSec);
  if (code === "video-size") return "video-size";
  if (code === "video-duration") return "video-duration";
  return null;
}

export function canMutate(shop: Shop, user: User | null, action: ShopAction): ShopRuleError | null {
  const owner = assertOwner(shop, user);
  if (owner) return owner;
  if (action === "publish") {
    const pub = publishErrors(shop);
    return pub[0] ?? null;
  }
  return null;
}
