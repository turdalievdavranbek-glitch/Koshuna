"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CATEGORIES, listingById } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const listings = useStore((s) => s.listings);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useStore((s) => s.favorites);
  const listing = listingById(params.id, listings);

  if (!listing) {
    return <div className="empty">Объявление не найдено.</div>;
  }

  const liked = favorites.includes(listing.id);
  const trail = listing.path.map((slug) => CATEGORIES[slug]).filter(Boolean);

  return (
    <div className="detail">
      <div className="crumbs">
        <Link href="/">Главная</Link>
        {trail.map((item) => (
          <span key={item.slug}>
            / <Link href={`/c/${item.slug}`}>{item.title}</Link>
          </span>
        ))}
      </div>
      <div className="detail-hero" style={{ background: listing.tint }}>
        {listing.emoji}
      </div>
      <h2>{listing.title}</h2>
      <div className="price" style={{ fontSize: 22, marginBottom: 8 }}>
        {listing.price}
      </div>
      <p>
        {listing.city} · раздел {trail.at(-1)?.title ?? listing.category}
      </p>
      <p>{listing.desc}</p>
      <button className="primary" type="button" onClick={() => toggleFavorite(listing.id)}>
        {liked ? "Убрать из избранного" : "В избранное"}
      </button>
    </div>
  );
}
