"use client";

import type { AuthMethod, Listing } from "@/lib/types";
import { isVideoListing as videoOf, isVoiceListing as voiceOf } from "@/lib/video-ai";
import { FEATURES } from "@/lib/features";
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
  playInline,
  circle,
}: {
  listing: { id?: string; ownerId?: string; sellerMethod?: AuthMethod; sellerCardLinked?: boolean; photos: string[]; mediaKind?: string; videoUrl?: string; voiceUrl?: string };
  alt: string;
  compact?: boolean;
  className?: string;
  playInline?: boolean;
  circle?: boolean;
}) {
  const video = isVideoListing(listing);
  const round = video || circle;
  const inner = round ? "rounded-full" : "rounded-[10px]";
  return (
    <div
      className={`relative ${round ? "rounded-full p-[2.5px]" : ""} ${className ?? ""}`}
      style={round ? { background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" } : undefined}
    >
      <div className={`relative aspect-square overflow-hidden bg-chip ${inner}`}>
        {playInline && video && listing.videoUrl ? (
          <video src={listing.videoUrl} muted playsInline loop autoPlay className="h-full w-full object-cover" />
        ) : (
          <Photo src={listing.photos[0]} alt={alt} />
        )}
        {video ? <PlayBadge compact={compact} /> : isVoiceListing(listing) ? <VoiceBadge compact={compact} /> : null}
        {FEATURES.accountStars && listing.id && listing.ownerId ? (
          <SellerStarsBadge
            listing={{
              id: listing.id,
              ownerId: listing.ownerId,
              sellerMethod: listing.sellerMethod,
              sellerCardLinked: listing.sellerCardLinked,
            }}
            compact={compact}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ListingHero({
  listing,
  photo,
  title,
  onOpenVideo,
  onAspect,
}: {
  listing: Listing;
  photo: number;
  title: string;
  /** Tap on a video opens the full-screen reels player. */
  onOpenVideo?: () => void;
  /** true for a vertical (portrait) video, so the box is tall, not a letterboxed 16:9. */
  onAspect?: (tall: boolean) => void;
}) {
  if (isVideoListing(listing) && listing.videoUrl) {
    return (
      <button type="button" data-testid="listing-video-open" aria-label={title} onClick={onOpenVideo} className="relative block h-full w-full">
        <video
          src={listing.videoUrl}
          poster={listing.photos[0]}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          className="pointer-events-none h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const el = event.currentTarget;
            if (el.videoWidth && el.videoHeight) onAspect?.(el.videoHeight >= el.videoWidth);
          }}
        />
        <PlayBadge />
      </button>
    );
  }
  return <Photo src={listing.photos[photo] ?? listing.photos[0]} alt={title} />;
}
