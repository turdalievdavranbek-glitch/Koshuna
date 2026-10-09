"use client";

import { useEffect, useRef } from "react";
import type { Listing } from "@/lib/types";

/** The /reels player: full-bleed vertical video, muted until the person turns sound on. */
export function ReelVideo({
  listing,
  active,
  preloadNext,
  sound,
  onToggleSound,
}: {
  listing: Listing;
  active: boolean;
  preloadNext: boolean;
  sound: boolean;
  onToggleSound: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.pause();
      el.muted = true;
      return;
    }
    el.muted = !sound;
    void el.play().catch(() => undefined);
  }, [active, sound]);

  return (
    <video
      ref={ref}
      src={listing.videoUrl}
      poster={listing.photos[0]}
      muted
      playsInline
      loop
      preload={active || preloadNext ? "auto" : "metadata"}
      className="absolute inset-0 h-full w-full object-cover"
      onClick={onToggleSound}
    />
  );
}
