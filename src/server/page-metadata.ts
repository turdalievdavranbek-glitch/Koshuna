import { eq } from "drizzle-orm";
import { DICT } from "@/lib/i18n";
import { listingOgCard, shopOgCard, type OgCard } from "@/lib/open-graph";
import { shopHasPointPlace, shopPlaceHeadline } from "@/lib/shops";
import { getDb } from "@/server/db";
import { listings, shops } from "@/server/db/schema";
import { rowToShop } from "@/server/mappers";
import type { Metadata } from "next";

function toMetadata(card: OgCard): Metadata {
  return {
    title: card.title,
    description: card.description,
    openGraph: {
      title: card.title,
      description: card.description,
      images: [card.image],
      url: card.url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: card.title,
      description: card.description,
      images: [card.image],
    },
  };
}

export async function listingPageMetadata(id: string): Promise<Metadata> {
  const rows = await getDb()
    .select({
      id: listings.id,
      status: listings.status,
      title: listings.title,
      price: listings.price,
      city: listings.city,
      district: listings.district,
      coverUrl: listings.coverUrl,
      photos: listings.photos,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return toMetadata(listingOgCard(null));
  const city = DICT.ru.cities[row.city] || row.city;
  const place = row.district ? `${city}, ${row.district}` : city;
  return toMetadata(
    listingOgCard({
      id: row.id,
      status: row.status,
      title: row.title,
      price: row.price,
      place,
      image: row.coverUrl || row.photos?.[0] || null,
    }),
  );
}

export async function shopPageMetadata(id: string): Promise<Metadata> {
  const rows = await getDb().select().from(shops).where(eq(shops.id, id)).limit(1);
  const row = rows[0];
  if (!row) return toMetadata(shopOgCard(null));
  const shop = rowToShop(row);
  const city = DICT.ru.cities[shop.city] || shop.city || row.city;
  const place = shopHasPointPlace(shop) ? shopPlaceHeadline(shop, city, "ru") : [city, shop.address].filter(Boolean).join(", ");
  return toMetadata(
    shopOgCard({
      id: row.id,
      status: row.status,
      name: shop.name || row.name,
      place,
      image: shop.coverUrl || row.photoUrl || null,
    }),
  );
}
