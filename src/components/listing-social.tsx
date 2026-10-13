"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { socialCounts } from "@/lib/reactions";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { useCommentCount } from "@/lib/comment-counts";
import { IconBookmark, IconChat, IconHeart } from "@/components/icons";
import { ShareButton } from "@/components/share-button";
import { CommentsButton, CommentsSheet } from "@/components/listing-comments";

export function ListingSocialMeta({
  listingId,
  size = "md",
  align = "start",
}: {
  listingId: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center";
}) {
  const { reactions } = useApp();
  const commentCount = useCommentCount(listingId);
  const { likes, comments } = socialCounts(listingId, reactions, FEATURES.comments ? commentCount : 0);
  const icon = size === "sm" ? 11 : size === "lg" ? 14 : 12;
  const text = size === "sm" ? "text-[9px]" : size === "lg" ? "text-[12px]" : "text-[11px]";
  const gap = size === "sm" ? "gap-1.5" : "gap-2.5";

  return (
    <div
      aria-hidden
      className={`pointer-events-none mt-1 flex flex-wrap items-center select-none ${gap} ${text} font-semibold text-muted-2 ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-0.5">
        <IconHeart size={icon} color="#6F6B8F" />
        <span className="tabular-nums">{likes}</span>
      </span>
      {FEATURES.comments ? (
        <span className="inline-flex min-w-0 items-center gap-0.5">
          <IconChat size={icon} color="#6F6B8F" />
          <span className="tabular-nums">{comments}</span>
        </span>
      ) : null}
    </div>
  );
}

/** Single ♡ like (old 👍 = like; old 👎 data kept but not shown). */
export function useListingLike(listingId: string) {
  const { user, setPendingPath, reactionOf, setReaction, reactions } = useApp();
  const router = useRouter();
  const liked = reactionOf(listingId) === "like";
  const { likes } = socialCounts(listingId, reactions, 0);
  const gate = useCallback(() => {
    if (user) return true;
    setPendingPath(`/listing/${listingId}`);
    router.push("/login");
    return false;
  }, [user, setPendingPath, router, listingId]);
  const toggle = useCallback(() => {
    if (!gate()) return;
    setReaction(listingId, "like");
  }, [gate, setReaction, listingId]);
  /** Double-tap: only ever turns the like on. */
  const likeOn = useCallback(() => {
    if (!gate()) return false;
    if (!liked) setReaction(listingId, "like");
    return true;
  }, [gate, liked, setReaction, listingId]);
  return { liked, likes, toggle, likeOn, gate };
}

/** Wraps the listing photo/video: double-tap = like with a heart pop. */
export function DoubleTapLike({ listingId, children, className }: { listingId: string; children: ReactNode; className?: string }) {
  const { likeOn } = useListingLike(listingId);
  const [pop, setPop] = useState(0);
  const lastTap = useRef(0);
  const fire = () => {
    if (likeOn()) setPop((n) => n + 1);
  };
  return (
    <div
      className={`relative ${className ?? ""}`}
      onTouchEnd={() => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          lastTap.current = 0;
          fire();
        } else lastTap.current = now;
      }}
      onDoubleClick={fire}
    >
      {children}
      {pop ? (
        <div key={pop} aria-hidden className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="heart-pop drop-shadow-[0_6px_18px_rgba(124,92,255,.55)]">
            <IconHeart size={96} filled color="#FF3B6B" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Reels-style ♡ + count and ➤ share, stacked on the media bottom-right. */
export function ListingMediaActions({ listing, className }: { listing: Listing; className?: string }) {
  const { t } = useApp();
  const { liked, likes, toggle } = useListingLike(listing.id);
  return (
    <div className={`absolute right-3 z-10 flex flex-col items-center gap-2 ${className ?? "bottom-14"}`}>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={toggle}
          data-testid="react-like"
          aria-label={t.likeLabel}
          aria-pressed={liked}
          title={t.likeLabel}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(20,16,40,.38)] backdrop-blur-[2px] active:scale-95"
        >
          <span key={liked ? "on" : "off"} className={liked ? "like-bump" : ""}>
            <IconHeart size={24} color={liked ? "#FF3B6B" : "#FFFFFF"} filled={liked} className="drop-shadow-[0_1px_3px_rgba(0,0,0,.55)]" />
          </span>
        </button>
        <span className="mt-0.5 text-[12px] font-bold tabular-nums text-white [text-shadow:0_1px_3px_rgba(0,0,0,.7)]">{likes}</span>
      </div>
      <ShareButton listing={listing} variant="overlay" />
    </div>
  );
}

export function ListingSocial({ listing, className }: { listing: Listing; className?: string }) {
  const { t, lang, isFav, toggleFav, user } = useApp();
  const [sheet, setSheet] = useState(false);
  const { gate } = useListingLike(listing.id);
  const saved = isFav(listing.id);
  const mine = Boolean(user && listing.ownerId === user.id);
  if (mine && !FEATURES.comments) return null;

  return (
    <div className={className ?? "mt-6"}>
      <div className="flex items-center gap-1">
        {FEATURES.comments ? <CommentsButton listingId={listing.id} onOpen={() => setSheet(true)} /> : null}
        <span className="flex-1" />
        {mine ? null : (
          <button
            type="button"
            onClick={() => {
              if (gate()) toggleFav(listing.id);
            }}
            data-testid="save-listing"
            aria-label={saved ? t.savedLabel : t.saveLabel}
            aria-pressed={saved}
            title={saved ? t.savedLabel : t.saveLabel}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-ink active:scale-95"
          >
            <IconBookmark size={23} color={saved ? "#7C5CFF" : "#2A2550"} filled={saved} />
            <span>{saved ? t.savedLabel : t.saveLabel}</span>
          </button>
        )}
      </div>
      {FEATURES.comments && sheet ? (
        <CommentsSheet listingId={listing.id} title={lang === "ky" ? listing.titleKy || listing.title : listing.title} onClose={() => setSheet(false)} />
      ) : null}
    </div>
  );
}
