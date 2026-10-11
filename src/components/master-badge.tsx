"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { isAdminUser } from "@/lib/partners";
import { isDbUserId } from "@/lib/phone";
import { useApp } from "@/lib/store";

let cache: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;
const listeners = new Set<(ids: Set<string>) => void>();

function loadMasters(force = false): Promise<Set<string>> {
  if (cache && !force) return Promise.resolve(cache);
  if (loading && !force) return loading;
  loading = api<{ ids?: string[] }>("/api/masters").then((res) => {
    cache = new Set(res.ok && Array.isArray(res.data?.ids) ? res.data.ids : []);
    loading = null;
    for (const fn of listeners) fn(cache);
    return cache;
  });
  return loading;
}

/** Ids of «Мастер-аккаунт» users, loaded once per app session. */
export function useMasterIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => cache ?? new Set());
  useEffect(() => {
    listeners.add(setIds);
    void loadMasters().then(setIds);
    return () => {
      listeners.delete(setIds);
    };
  }, []);
  return ids;
}

/** ✔ Мастер — next to a master account's name. Renders nothing for others. */
export function MasterBadge({ userId, on }: { userId?: string | null; on?: boolean }) {
  const { t } = useApp();
  const ids = useMasterIds();
  const show = on ?? Boolean(userId && ids.has(userId));
  if (!show) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white" title={t.masterAccount}>
      ✔ {t.masterBadge}
    </span>
  );
}

/** Admin only: turn «Мастер-аккаунт» on/off for a user. */
export function MasterToggle({ userId, className }: { userId: string; className?: string }) {
  const { t, user } = useApp();
  const ids = useMasterIds();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!isAdminUser(user) || !isDbUserId(userId)) return null;
  const on = ids.has(userId);
  const flip = () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    void api(`/api/admin/users/${encodeURIComponent(userId)}/master`, { method: "POST", json: { on: !on } }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(true);
        return;
      }
      void loadMasters(true);
    });
  };
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={flip}
        className={className ?? "mt-3 h-11 w-full rounded-xl border border-line bg-white text-[14px] font-semibold text-ink disabled:opacity-40"}
      >
        {on ? t.masterOff : t.masterOn}
      </button>
      {error ? <div className="mt-1 text-[12px] font-semibold text-accent">{t.masterFail}</div> : null}
    </>
  );
}
