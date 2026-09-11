import { formatSom, settlementById, settlementLabel } from "./data";
import { listingTitle, type Dict } from "./i18n";
import type { Lang, Listing } from "./types";

export function listingPlace(listing: Listing, t: Dict, lang: Lang): string {
  const s = settlementById(listing.settlement);
  if (s) return `${settlementLabel(s, lang)} · ${t.cities[listing.city]}`;
  if (listing.district) return `${t.cities[listing.city]}, ${listing.district}`;
  return t.cities[listing.city];
}

export function storyCaption(listing: Listing, t: Dict, lang: Lang): string {
  const title = listingTitle(listing, lang);
  const place = listingPlace(listing, t, lang);
  const unit = listing.unit ? ` ${t.units[listing.unit]}` : "";
  return [
    `${t.fromNeighbor} · ${place}`,
    `${title}`,
    `${formatSom(listing.price)} KGS${unit}`,
    t.storyCaptionTail,
  ].join("\n");
}

export function familyShareText(listing: Listing, t: Dict, lang: Lang): string {
  const title = listingTitle(listing, lang);
  const place = listingPlace(listing, t, lang);
  const unit = listing.unit ? ` ${t.units[listing.unit]}` : "";
  const price = `${formatSom(listing.price)} KGS${unit}`;
  return t.familyShareBody(title, place, price);
}

export function ownerShareText(
  listing: Listing,
  t: Dict,
  lang: Lang,
  url: string,
): string {
  const title = listingTitle(listing, lang);
  const place = listingPlace(listing, t, lang);
  const unit = listing.unit ? ` ${t.units[listing.unit]}` : "";
  const price = `${formatSom(listing.price)} KGS${unit}`;
  return t.ownerShareBody(title, place, price, url);
}

export function listingPublicUrl(id: string): string {
  if (typeof window === "undefined") return `/listing/${id}`;
  return `${window.location.origin}/listing/${id}`;
}

export function socialShareHref(
  network: "whatsapp" | "telegram" | "facebook" | "vk",
  listing: Listing,
  t: Dict,
  lang: Lang,
): string {
  const url = listingPublicUrl(listing.id);
  const text = ownerShareText(listing, t, lang, url);
  const title = listingTitle(listing, lang);
  if (network === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (network === "telegram") {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
  if (network === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }
  return `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&comment=${encodeURIComponent(text)}`;
}

export function voiceScript(listing: Listing, lang: Lang): string {
  if (lang === "ky") return listing.voiceTextKy || listing.voiceText || listing.titleKy;
  return listing.voiceText || listing.title;
}
