"use client";

import { useState, type ReactNode } from "react";

export function badgeText(n: number): string {
  return n > 9 ? "9+" : String(n);
}

/** Counter that changes only when `count` goes up. Used as a key to replay a one-time CSS animation. */
function useRise(count: number): number {
  const [seen, setSeen] = useState(count);
  const [rise, setRise] = useState(0);
  if (count !== seen) {
    setSeen(count);
    if (count > seen) setRise(rise + 1);
  }
  return rise;
}

/** Red count badge on the top-right of an icon. Hidden at 0. Parent must be `relative`. */
export function UnreadBadge({ count, testId, className = "" }: { count: number; testId?: string; className?: string }) {
  const rise = useRise(count);
  if (count <= 0) return null;
  return (
    <span
      key={rise}
      data-testid={testId}
      aria-hidden
      className={`unread-badge pointer-events-none absolute z-[1] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E0242B] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white ${rise ? "unread-pop" : ""} ${className}`}
    >
      {badgeText(count)}
    </span>
  );
}

/** Wraps an icon so it shakes once when `count` increases. */
export function RingOnRise({ count, children }: { count: number; children: ReactNode }) {
  const rise = useRise(count);
  return (
    <span key={rise} className={`flex items-center justify-center ${rise ? "bell-ring" : ""}`}>
      {children}
    </span>
  );
}
