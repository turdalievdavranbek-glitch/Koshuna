"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api/client";

export type AppNotice = {
  id: string;
  type: string;
  listingId: string | null;
  textKey: string;
  params: { name?: string; title?: string; threadId?: string; requestId?: string };
  createdAt: string;
  readAt: string | null;
};

type Snap = { notices: AppNotice[]; unread: number; ready: boolean };

const empty: Snap = { notices: [], unread: 0, ready: false };
let snap: Snap = empty;
const listeners = new Set<() => void>();
let loadedFor: string | null = null;
let inflight: Promise<void> | null = null;
let epoch = 0;
let flight = 0;

function emit(next: Snap) {
  snap = next;
  listeners.forEach((fn) => fn());
}

export function subscribeNotices(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getNoticesSnapshot(): Snap {
  return snap;
}

export function refreshNotices(userId: string | null): Promise<void> {
  if (!userId) {
    loadedFor = null;
    emit({ notices: [], unread: 0, ready: true });
    return Promise.resolve();
  }
  if (inflight && loadedFor === userId) return inflight;
  if (loadedFor !== userId) emit({ notices: [], unread: 0, ready: false });
  loadedFor = userId;
  const seen = epoch;
  const ticket = ++flight;
  inflight = (async () => {
    try {
      const res = await api<{ notices?: AppNotice[]; unread?: number }>("/api/me/notices");
      if (loadedFor !== userId || seen !== epoch) return;
      if (!res.ok) {
        emit({ ...snap, ready: true });
        return;
      }
      emit({
        notices: res.data?.notices ?? [],
        unread: res.data?.unread ?? 0,
        ready: true,
      });
    } finally {
      if (ticket === flight) inflight = null;
    }
  })();
  return inflight;
}

export async function markNoticesRead(userId: string): Promise<void> {
  epoch += 1;
  const res = await api("/api/me/notices", { method: "POST" });
  if (!res.ok || loadedFor !== userId) return;
  const now = new Date().toISOString();
  emit({
    notices: snap.notices.map((row) => ({ ...row, readAt: row.readAt ?? now })),
    unread: 0,
    ready: true,
  });
}

export function useNotices(userId: string | null): Snap {
  const value = useSyncExternalStore(subscribeNotices, getNoticesSnapshot, () => empty);
  useEffect(() => {
    void refreshNotices(userId);
    if (!userId) return;
    const onShow = () => {
      if (document.visibilityState === "visible") void refreshNotices(userId);
    };
    document.addEventListener("visibilitychange", onShow);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshNotices(userId);
    }, 12000);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.clearInterval(timer);
    };
  }, [userId]);
  return value;
}
