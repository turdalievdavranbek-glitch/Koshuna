"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatWhen } from "@/lib/dates";
import { useApp } from "@/lib/store";

type HoldRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerName: string;
  status: "requested" | "confirmed" | "cancelled" | "released" | "expired";
  createdAt: string;
};

export function HoldInbox() {
  const { t, lang, user } = useApp();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<HoldRow[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    const load = () => {
      void api<{ holds?: HoldRow[] }>("/api/me/holds").then((res) => {
        if (cancel) return;
        setRows(res.ok ? res.data?.holds ?? [] : []);
        setReady(true);
      });
    };
    load();
    const onShow = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancel = true;
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [userId]);

  if (!userId) return null;

  const answer = (row: HoldRow, action: "confirm" | "decline") => {
    setBusyId(row.id);
    setError("");
    void api<{ hold?: HoldRow }>(`/api/me/holds/${encodeURIComponent(row.id)}`, { method: "POST", json: { action } }).then((res) => {
      setBusyId("");
      const next = res.data?.hold;
      if (!res.ok || !next) {
        setError(t.holdFailed);
        return;
      }
      setRows((list) => list.map((item) => (item.id === row.id ? { ...item, ...next } : item)));
    });
  };

  return (
    <section data-testid="hold-inbox">
      <h2 className="font-display text-[19px] font-bold text-ink">{t.holdInbox}</h2>
      {!ready ? null : rows.length === 0 ? (
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.holdInboxEmpty}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => {
            const who = row.buyerName.trim() || t.holdNoName;
            return (
              <div key={row.id} className="rounded-[16px] border border-line bg-white px-3.5 py-3">
                <button type="button" onClick={() => router.push(`/listing/${row.listingId}`)} className="block w-full text-left">
                  <div className="text-[15px] font-semibold leading-[1.35] text-ink">{who}</div>
                  <div className="mt-0.5 text-[14px] leading-[1.35] text-ink">{row.listingTitle}</div>
                  <div className="mt-1 text-[12px] text-muted-2">{formatWhen(row.createdAt, lang)}</div>
                </button>
                {row.status === "requested" ? (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      data-testid="hold-accept"
                      disabled={busyId === row.id}
                      onClick={() => answer(row, "confirm")}
                      className="h-9 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-on disabled:opacity-60"
                    >
                      {t.holdAccept}
                    </button>
                    <button
                      type="button"
                      data-testid="hold-decline"
                      disabled={busyId === row.id}
                      onClick={() => answer(row, "decline")}
                      className="h-9 rounded-full border border-line px-4 text-[13px] font-semibold text-ink disabled:opacity-60"
                    >
                      {t.holdDecline}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] font-semibold text-muted">
                    {row.status === "confirmed" ? t.holdDoneYes : t.holdDoneNo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
    </section>
  );
}
