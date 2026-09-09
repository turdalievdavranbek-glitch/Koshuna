"use client";

import type { Listing } from "@/lib/types";
import { Photo } from "./ui";

export function isVideoListing(listing: { mediaKind?: string; videoUrl?: string }) {
  return listing.mediaKind === "video" || Boolean(listing.videoUrl);
}

export function PlayBadge({ compact }: { compact?: boolean }) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  return (
    <span className={`pointer-events-none absolute inset-0 flex items-center justify-center`}>
      <span className={`flex ${size} items-center justify-center rounded-full bg-[rgba(23,20,15,.72)] pl-0.5 text-white`}>
        ▶
      </span>
    </span>
  );
}

export function ListingHero({ listing, photo, title }: { listing: Listing; photo: number; title: string }) {
  if (isVideoListing(listing) && listing.videoUrl) {
    return (
      <video
        src={listing.videoUrl}
        poster={listing.photos[0]}
        controls
        playsInline
        className="h-full w-full object-cover"
      />
    );
  }
  return <Photo src={listing.photos[photo] ?? listing.photos[0]} alt={title} />;
}
