import type { Shop } from "./types";

export function shopPublicUrl(id: string): string {
  if (typeof window === "undefined") return `/shops/${id}`;
  return `${window.location.origin}/shops/${id}`;
}

export function shopShareHref(
  network: "whatsapp" | "telegram" | "facebook" | "vk",
  shop: Shop,
  text: string,
): string {
  const url = shopPublicUrl(shop.id);
  if (network === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (network === "telegram") {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
  if (network === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }
  return `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shop.name)}&comment=${encodeURIComponent(text)}`;
}
