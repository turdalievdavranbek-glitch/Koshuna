"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { useStore } from "@/lib/store";

export function ListingCard({ listing }: { listing: Listing }) {
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useStore((s) => s.favorites);
  const liked = favorites.includes(listing.id);

  return (
    <article className="card">
      <Link href={`/listing/${listing.id}`} className="thumb" style={{ background: listing.tint }}>
        {listing.emoji}
      </Link>
      <Link href={`/listing/${listing.id}`}>
        <h3>{listing.title}</h3>
        <div className="price">{listing.price}</div>
        <div className="meta">
          {listing.city} · {timeAgo(listing.createdAt)}
        </div>
      </Link>
      <button
        className="icon-btn"
        type="button"
        aria-label="В избранное"
        onClick={() => toggleFavorite(listing.id)}
      >
        {liked ? "♥" : "♡"}
      </button>
    </article>
  );
}

function timeAgo(ts: number) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins} мин`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч`;
  return `${Math.round(hours / 24)} д`;
}
