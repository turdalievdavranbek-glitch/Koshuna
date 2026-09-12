"use client";

import { listingsFor } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ListingCard } from "./ListingCard";

export function ListingList({ slug }: { slug?: string }) {
  const listings = useStore((s) => s.listings);
  const items = listingsFor(slug, listings);

  if (!items.length) {
    return <div className="empty">Пока нет объявлений в этом разделе.</div>;
  }

  return (
    <div className="list">
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
