"use client";

import { useEffect, useRef, useState } from "react";
import { formatSom } from "@/lib/data";
import { listingHasPrice } from "@/lib/deal";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconBack } from "./icons";
import { ReelVideo } from "./reel-video";

const CLOSE_DRAG_PX = 110;

/**
 * Full-screen vertical player for a video listing, the same player as /reels:
 * autoplay muted, sound toggle, back/close, swipe down to close; price, title and «Написать» at the bottom.
 */
export function ListingVideoViewer({
  listing,
  title,
  onClose,
  onWrite,
}: {
  listing: Listing;
  title: string;
  onClose: () => void;
  /** Hidden for the owner. */
  onWrite?: () => void;
}) {
  const { t } = useApp();
  const [sound, setSound] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const price = listingHasPrice(listing) ? formatSom(listing.price) : t.priceNegotiable;

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const close = () => closeRef.current();
    pushOverlay("listing-video", close);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      removeOverlay("listing-video");
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="listing-video-viewer"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
      onTouchStart={(event) => {
        startY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(event) => {
        if (startY.current == null) return;
        const dy = (event.touches[0]?.clientY ?? startY.current) - startY.current;
        setDrag(dy > 0 ? dy : 0);
      }}
      onTouchEnd={() => {
        const close = drag > CLOSE_DRAG_PX;
        startY.current = null;
        setDrag(0);
        if (close) onClose();
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-ink desk:aspect-[9/16] desk:h-[min(92vh,900px)] desk:w-auto desk:rounded-[20px]"
        style={drag ? { transform: `translateY(${drag}px)`, opacity: Math.max(0.4, 1 - drag / 500) } : undefined}
      >
        <ReelVideo listing={listing} active preloadNext={false} sound={sound} onToggleSound={() => setSound((value) => !value)} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(23,20,15,.45)] via-transparent to-[rgba(23,20,15,.8)]" />
        <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <button
            type="button"
            data-testid="listing-video-close"
            aria-label={t.backLeave}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/92"
          >
            <IconBack size={17} color="#17140F" />
          </button>
          <button
            type="button"
            data-testid="listing-video-sound"
            onClick={() => setSound((value) => !value)}
            className="rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-ink"
          >
            {sound ? t.reelSoundOn : t.reelSoundOff}
          </button>
        </div>
        <div className="absolute right-0 bottom-0 left-0 z-10 px-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
          <div className="text-[20px] font-bold text-white">{price}</div>
          <div className="mt-0.5 line-clamp-2 font-display text-[17px] font-semibold text-white">{title}</div>
          {onWrite ? (
            <button
              type="button"
              data-testid="listing-video-write"
              onClick={onWrite}
              className="mt-3 h-12 w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on"
            >
              {t.write}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
