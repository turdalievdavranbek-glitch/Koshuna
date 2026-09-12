"use client";

import { useMemo, useState } from "react";
import { ROOT_TILES, listingsFor } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { TileGrid } from "@/components/TileGrid";
import { ListingCard } from "@/components/ListingCard";

export default function HomePage() {
  const [q, setQ] = useState("");
  const listings = useStore((s) => s.listings);
  const feed = useMemo(() => {
    const all = listingsFor(undefined, listings);
    const query = q.trim().toLowerCase();
    if (!query) return all.slice(0, 8);
    return all.filter((item) =>
      `${item.title} ${item.city} ${item.desc}`.toLowerCase().includes(query),
    );
  }, [listings, q]);

  return (
    <div>
      <input
        className="search"
        placeholder="Найти Camry, квартиру, iPhone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="section-title">
        <h2>Разделы</h2>
        <span className="muted">нажмите Авто</span>
      </div>
      <TileGrid tiles={ROOT_TILES} />
      <p className="hero-note">
        Вложенные плитки: <b>Авто → Легковые → Продажа</b>. Избранное и подача объявления — внизу.
      </p>
      <div className="section-title">
        <h2>{q ? "Нашлись" : "Свежие"}</h2>
        <span className="muted">{feed.length}</span>
      </div>
      <div className="list">
        {feed.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
