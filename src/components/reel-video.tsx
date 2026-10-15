"use client";

import { useEffect, useRef } from "react";
import type { Listing } from "@/lib/types";
import { playWithSound } from "@/lib/video-sound";

/** The /reels player: full-bleed vertical video, sound on by default (muted only if the browser blocks it). */
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
    // Sound on by default: try unmuted, fall back to muted + «tap for sound» if the browser refuses.
    return playWithSound(el, sound);
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
