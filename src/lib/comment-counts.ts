"use client";

import { FEATURES } from "./features";
import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api/client";

/** Visible comment counts for cards, fetched in small batches and shared by every card. */
const counts = new Map<string, number>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;

function emit() {
  version += 1;
  for (const fn of listeners) fn();
}

function flush() {
  timer = null;
  const ids = [...pending].slice(0, 100);
  for (const id of ids) pending.delete(id);
  if (pending.size) timer = setTimeout(flush, 60);
  if (!ids.length) return;
  void api<{ counts: Record<string, number> }>(`/api/comments/counts?ids=${ids.map(encodeURIComponent).join(",")}`).then((res) => {
    if (!res.ok || !res.data) return;
    for (const id of ids) counts.set(id, res.data.counts[id] ?? 0);
    emit();
  });
}

function want(id: string) {
  if (!FEATURES.comments) return;
  if (counts.has(id) || pending.has(id)) return;
  pending.add(id);
  if (!timer) timer = setTimeout(flush, 60);
}

export function setCommentCount(id: string, n: number) {
  counts.set(id, Math.max(0, n));
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useCommentCount(id: string): number {
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    want(id);
  }, [id]);
  return counts.get(id) ?? 0;
}
