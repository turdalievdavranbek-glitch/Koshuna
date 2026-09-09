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
  return t.familyShareBody(title, place, `${formatSom(listing.price)} KGS${unit}`);
}

export function voiceScript(listing: Listing, lang: Lang): string {
  if (lang === "ky") return listing.voiceTextKy || listing.voiceText || listing.titleKy;
  if (lang === "en") return listing.voiceTextEn || listing.voiceText || listing.titleEn;
  return listing.voiceText || listing.title;
}
