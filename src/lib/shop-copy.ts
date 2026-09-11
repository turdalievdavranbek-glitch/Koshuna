import type { Dict } from "./i18n";

export function shopErrorText(t: Dict, code?: string): string {
  switch (code) {
    case "auth":
      return t.shopNeedAuth;
    case "forbidden":
      return t.shopForbidden;
    case "name":
      return t.shopNeedName;
    case "category":
      return t.shopNeedCategory;
    case "city":
      return t.shopNeedCity;
    case "address":
      return t.shopNeedAddress;
    case "contact":
      return t.shopNeedContact;
    case "confirm":
      return t.shopNeedConfirm;
    case "quantity":
      return t.shopNeedQuantity;
    case "price":
      return t.shopNeedPrice;
    case "video-size":
      return t.shopVideoSize;
    case "video-duration":
      return t.shopVideoTime;
    case "network":
      return t.shopNetwork;
    case "reuse":
      return t.shopItemReuseMax;
    case "need-transcript":
      return t.shopAiNeedSpeech;
    default:
      return t.shopError;
  }
}

export function shopKindLabel(t: Dict, id: string | undefined | null): string {
  if (!id) return "";
  return t.shopKinds[id] || t.shopCats[id] || id;
}

export function shopQtyLabel(t: Dict, product: { quantity?: number; unit: string }): string | null {
  if (product.quantity == null || product.quantity <= 0) return null;
  const n = Number.isInteger(product.quantity) ? String(product.quantity) : String(product.quantity);
  return `${n} ${t.shopUnits[product.unit] ?? product.unit}`;
}
