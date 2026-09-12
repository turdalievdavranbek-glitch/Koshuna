"use client";

import { ListingCard } from "@/components/ListingCard";
import { useStore } from "@/lib/store";

export default function FavoritesPage() {
  const listings = useStore((s) => s.listings);
  const favorites = useStore((s) => s.favorites);
  const items = listings.filter((item) => favorites.includes(item.id));

  return (
    <div>
      <div className="section-title">
        <h2>Избранное</h2>
        <span className="muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="empty">Пока пусто. Нажмите ♡ на карточке на главной или в Авто.</div>
      ) : (
        <div className="list">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
