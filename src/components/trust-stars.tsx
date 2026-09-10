"use client";

import { starsForAuth, starsForListing, type TrustStars as StarCount } from "@/lib/trust";
import { useApp } from "@/lib/store";
import type { AuthMethod } from "@/lib/types";

function Star({ filled, size, onDark }: { filled: boolean; size: number; onDark?: boolean }) {
  const on = onDark ? "#FFF7F0" : "#B8452F";
  const off = onDark ? "rgba(255,247,240,.4)" : "#C9BBA8";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.4 9.9 5.5l4.5.5-3.3 3 1 4.5L8 11.6 3.9 13.5l1-4.5-3.3-3 4.5-.5z"
        fill={filled ? on : "none"}
        stroke={filled ? on : off}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustStars({
  n,
  size = 14,
  className,
  onDark,
}: {
  n: StarCount | number;
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  const count = Math.max(0, Math.min(3, n));
  return (
    <span className={`inline-flex items-center gap-[2px] ${className ?? ""}`} aria-label={`${count}`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} filled={i < count} size={size} onDark={onDark} />
      ))}
    </span>
  );
}

export function TrustMethodMark({ method, card }: { method: AuthMethod; card?: boolean }) {
  return <TrustStars n={starsForAuth(method, card)} size={12} />;
}

export function SellerStarsBadge({
  listing,
  compact,
  placed,
}: {
  listing: { id: string; ownerId: string; sellerMethod?: AuthMethod; sellerCardLinked?: boolean };
  compact?: boolean;
  placed?: boolean;
}) {
  const { user, extraListings } = useApp();
  const n = starsForListing(listing, extraListings, user);
  return (
    <span
      className={`pointer-events-none z-[1] flex items-center rounded-full bg-[rgba(23,20,15,.72)] ${
        placed ? "relative" : "absolute"
      } ${
        compact && !placed ? "bottom-1.5 right-1.5 px-1 py-[3px]" : placed ? "px-1.5 py-1" : "bottom-2 right-2 px-1.5 py-1"
      }`}
    >
      <TrustStars n={n} size={compact ? 9 : 11} onDark />
    </span>
  );
}
