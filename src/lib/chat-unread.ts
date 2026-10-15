"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api/client";
import { getNoticesSnapshot, subscribeNotices } from "./notices";

/**
 * Unread chat messages for the tab bar / header badge.
 * No own timer: refreshes on mount, when the app comes back to the screen,
 * and when the existing notices poll sees a new notice (chat messages create one).
 * Throttled, so many badges on one screen share one request.
 */
let unread = 0;
let loadedFor: string | null = null;
let lastAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const MIN_GAP_MS = 10000;

function emit(next: number) {
  if (next === unread) return;
  unread = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Set from a screen that already loaded the threads (the inbox). */
export function setChatUnread(userId: string | null, n: number): void {
  if (!userId) return;
  loadedFor = userId;
  lastAt = Date.now();
  emit(Math.max(0, n));
}

export function refreshChatUnread(userId: string | null, force = false): Promise<void> {
  if (!userId) {
    loadedFor = null;
    emit(0);
    return Promise.resolve();
  }
  if (loadedFor !== userId) {
    loadedFor = null;
    emit(0);
  }
  if (inflight) return inflight;
  if (!force && loadedFor === userId && Date.now() - lastAt < MIN_GAP_MS) return Promise.resolve();
  lastAt = Date.now();
  inflight = (async () => {
    try {
      const res = await api<{ unread?: number }>("/api/me/threads");
      if (res.ok) {
        loadedFor = userId;
        emit(Math.max(0, Number(res.data?.unread ?? 0) || 0));
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useChatUnread(userId: string | null): number {
  const value = useSyncExternalStore(subscribe, () => unread, () => 0);
  useEffect(() => {
    void refreshChatUnread(userId);
    if (!userId) return;
    let seen = getNoticesSnapshot().unread;
    const offNotices = subscribeNotices(() => {
      const next = getNoticesSnapshot().unread;
      if (next > seen) void refreshChatUnread(userId, true);
      seen = next;
    });
    const onShow = () => {
      if (document.visibilityState === "visible") void refreshChatUnread(userId);
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      offNotices();
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [userId]);
  return userId ? value : 0;
}
