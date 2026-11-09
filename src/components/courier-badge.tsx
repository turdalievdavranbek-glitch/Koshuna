"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";

let cache: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;
const listeners = new Set<(ids: Set<string>) => void>();

function loadCouriers(force = false): Promise<Set<string>> {
  if (cache && !force) return Promise.resolve(cache);
  if (loading && !force) return loading;
  loading = api<{ ids?: string[] }>("/api/couriers").then((res) => {
    cache = new Set(res.ok && Array.isArray(res.data?.ids) ? res.data.ids : []);
    loading = null;
    for (const fn of listeners) fn(cache);
    return cache;
  });
  return loading;
}

export function refreshCourierBadge(): void {
  void loadCouriers(true);
}

/** ✔ Курьер — same idea as the promoter badge. */
export function CourierBadge({ userId, on }: { userId?: string | null; on?: boolean }) {
  const { t } = useApp();
  const [ids, setIds] = useState<Set<string>>(() => cache ?? new Set());
  useEffect(() => {
    listeners.add(setIds);
    void loadCouriers().then(setIds);
    return () => {
      listeners.delete(setIds);
    };
  }, []);
  const show = on ?? Boolean(userId && ids.has(userId));
  if (!show) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#E7F6EC] px-2 py-0.5 text-[10px] font-bold text-[#1B7A3A]" title={t.deliveryCourierTitle}>
      ✔ {t.deliveryCourierBadge}
    </span>
  );
}
