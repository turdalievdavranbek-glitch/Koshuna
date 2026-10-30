"use client";

import { useEffect } from "react";
import { api } from "@/lib/api/client";

const PING_MS = 60_000;
let started = false;

/** While the app is open and visible, ping once a minute so others see «в сети». */
export function usePresenceHeartbeat(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId || started) return;
    started = true;
    const beat = () => {
      if (document.visibilityState === "visible") void api("/api/me/ping", { method: "POST" });
    };
    beat();
    const timer = window.setInterval(beat, PING_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      started = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);
}

export const ONLINE_MS = 2 * 60_000;

/** «в сети» / «был(а) 5 мин назад» / «был(а) 3 ч назад» / «был(а) 2 дн назад». */
export function presenceLabel(
  lastSeenIso: string | null | undefined,
  t: { presenceOnline: string; presenceMin: (n: number) => string; presenceHour: (n: number) => string; presenceDay: (n: number) => string },
  now = Date.now(),
): string {
  if (!lastSeenIso) return "";
  const ago = now - new Date(lastSeenIso).getTime();
  if (!Number.isFinite(ago)) return "";
  if (ago < ONLINE_MS) return t.presenceOnline;
  const min = Math.round(ago / 60_000);
  if (min < 60) return t.presenceMin(min);
  const h = Math.round(min / 60);
  if (h < 24) return t.presenceHour(h);
  const d = Math.round(h / 24);
  return d <= 30 ? t.presenceDay(d) : "";
}

/** Rounded bucket of a median reply time. */
export function replyBucket(ms: number | null | undefined): "minutes" | "hour" | "hours" | "day" | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const min = ms / 60_000;
  if (min < 20) return "minutes";
  if (min < 90) return "hour";
  if (min < 12 * 60) return "hours";
  return "day";
}
