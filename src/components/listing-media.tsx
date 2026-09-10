"use client";

import type { Listing } from "@/lib/types";
import { isVideoListing as videoOf, isVoiceListing as voiceOf } from "@/lib/video-ai";
import { SellerStarsBadge } from "./trust-stars";
import { Photo } from "./ui";

export function isVideoListing(listing: { mediaKind?: string; videoUrl?: string }) {
  return videoOf(listing);
}

export function isVoiceListing(listing: { mediaKind?: string; voiceUrl?: string; videoUrl?: string }) {
  return voiceOf(listing);
}

export function PlayBadge({ compact }: { compact?: boolean }) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className={`flex ${size} items-center justify-center rounded-full bg-[rgba(23,20,15,.72)] pl-0.5 text-white`}>
        ▶
      </span>
    </span>
  );
}

export function VoiceBadge({ compact }: { compact?: boolean }) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className={`flex ${size} items-end justify-center gap-0.5 rounded-full bg-[rgba(23,20,15,.72)] pb-2`}>
        <span className="w-[2px] rounded-full bg-white" style={{ height: compact ? 6 : 8 }} />
        <span className="w-[2px] rounded-full bg-white" style={{ height: compact ? 11 : 14 }} />
        <span className="w-[2px] rounded-full bg-white" style={{ height: compact ? 8 : 10 }} />
      </span>
    </span>
  );
}

export function ListingThumb({
  listing,
  alt,
  compact,
  className,
}: {
  listing: { id?: string; ownerId?: string; photos: string[]; mediaKind?: string; videoUrl?: string; voiceUrl?: string };
  alt: string;
  compact?: boolean;
  className?: string;
}) {
  const video = isVideoListing(listing);
  const inner = video ? "rounded-full" : "rounded-[10px]";
  return (
    <div
      className={`relative ${video ? "rounded-full p-[2.5px]" : ""} ${className ?? ""}`}
      style={video ? { background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" } : undefined}
    >
      <div className={`relative aspect-square overflow-hidden bg-chip ${inner}`}>
        <Photo src={listing.photos[0]} alt={alt} />
        {video ? <PlayBadge compact={compact} /> : isVoiceListing(listing) ? <VoiceBadge compact={compact} /> : null}
        {listing.id && listing.ownerId ? (
          <SellerStarsBadge listing={{ id: listing.id, ownerId: listing.ownerId }} compact={compact} />
        ) : null}
      </div>
    </div>
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
