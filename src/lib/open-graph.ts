import { formatSom } from "./data";

export const SITE_ORIGIN = "https://koshuna.ru";
export const SITE_TITLE = "Коңшу — маркетплейс Кыргызстана";
export const SITE_DESCRIPTION =
  "Жильё, секонд-хенд, авто, услуги и вакансии по всему Кыргызстану. Местные находки. Новые начала.";
export const OG_FALLBACK = "/brand/og-default.png";

const LISTING_PUBLIC = new Set(["active", "promoted", "reserved", "closed"]);

export type OgCard = {
  title: string;
  description: string;
  image: string;
  url?: string;
  /** Hidden, withdrawn, expired or unknown: generic site card, no item title or photo. */
  hidden: boolean;
};

export function genericOgCard(): OgCard {
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    image: OG_FALLBACK,
    hidden: true,
  };
}

/** Site-relative path, or an https URL. Never a phone, data URL, or http image. */
export function publicOgImage(url: string | null | undefined): string {
  if (!url) return OG_FALLBACK;
  const value = url.trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return OG_FALLBACK;
  if (value.startsWith("https://")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return OG_FALLBACK;
}

export function listingOgCard(
  row: {
    id: string;
    status: string;
    title: string;
    price: number | null;
    place: string;
    image: string | null;
  } | null,
): OgCard {
  if (!row || !LISTING_PUBLIC.has(row.status)) return genericOgCard();
  const price = row.price != null && row.price > 0 ? `${formatSom(row.price)} KGS` : "договорная";
  const place = row.place.trim();
  return {
    hidden: false,
    title: `${row.title} — ${price}`,
    description: place ? `${place} · Коңшу` : "Коңшу",
    image: publicOgImage(row.image),
    url: `${SITE_ORIGIN}/listing/${row.id}`,
  };
}

export function shopOgCard(
  row: { id: string; status: string; name: string; place: string; image: string | null } | null,
): OgCard {
  if (!row || row.status !== "active") return genericOgCard();
  const place = row.place.trim();
  return {
    hidden: false,
    title: row.name,
    description: place ? `${place} · Коңшу` : "Коңшу",
    image: publicOgImage(row.image),
    url: `${SITE_ORIGIN}/shops/${row.id}`,
  };
}
