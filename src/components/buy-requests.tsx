"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminAreaById, adminAreaLabel } from "@/lib/admin-areas";
import { api } from "@/lib/api/client";
import type { BuyRequestRow } from "@/lib/buy-request";
import { useApp } from "@/lib/store";

function placeLabel(row: BuyRequestRow, lang: string, oblasts: Record<string, string>): string {
  const area = adminAreaById(row.district);
  const district = area ? adminAreaLabel(area, lang) : "";
  const oblast = oblasts[row.oblast] ?? "";
  return [district, oblast].filter(Boolean).join(" · ");
}

function dayLabel(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "ky" ? "ky" : "ru", {
    timeZone: "Asia/Bishkek",
    day: "numeric",
    month: "short",
  }).format(date);
}

function RequestCard({
  row,
  action,
}: {
  row: BuyRequestRow;
  action?: { label: string; busy: boolean; onClick: () => void };
}) {
  const { t, lang } = useApp();
  const place = placeLabel(row, lang, t.oblasts);
  const closed = row.status !== "open";
  return (
    <div className="rounded-[16px] border border-line bg-white px-3.5 py-3">
      <div className="text-[15px] font-semibold leading-[1.35] text-ink">{row.buyerName?.trim() || row.text}</div>
      {row.buyerName ? <div className="mt-0.5 text-[14px] leading-[1.35] text-ink">{row.text}</div> : null}
      <div className="mt-1 text-[12px] leading-[1.4] text-muted">
        {[t.shopCats[row.category] ?? row.category, row.quantity, place, dayLabel(row.deadline, lang), row.needsDelivery ? t.buyRequestWithDelivery : t.buyRequestNoDelivery]
          .filter(Boolean)
          .join(" · ")}
      </div>
      {closed ? (
        <div className="mt-2 text-[13px] font-semibold text-muted">{row.status === "found" ? t.buyRequestFoundDone : t.buyRequestClosed}</div>
      ) : action ? (
        <button type="button" disabled={action.busy} onClick={action.onClick} className="mt-2 text-[14px] font-bold text-accent disabled:opacity-60">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function MyBuyRequests() {
  const { t, user } = useApp();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<BuyRequestRow[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    void api<{ requests?: BuyRequestRow[] }>("/api/me/purchase-requests").then((res) => {
      if (cancel) return;
      setRows(res.ok ? res.data?.requests ?? [] : []);
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [userId]);

  if (!userId) return null;

  const close = (row: BuyRequestRow) => {
    setBusyId(row.id);
    setError("");
    void api<{ request?: BuyRequestRow }>(`/api/me/purchase-requests/${encodeURIComponent(row.id)}/close`, { method: "POST" }).then((res) => {
      setBusyId("");
      const next = res.data?.request;
      if (!res.ok || !next) {
        setError(t.buyRequestFail);
        return;
      }
      setRows((list) => list.map((item) => (item.id === row.id ? next : item)));
    });
  };

  return (
    <section data-testid="my-buy-requests">
      <h2 className="font-display text-[19px] font-bold text-ink">{t.buyRequestMine}</h2>
      {!ready ? null : rows.length === 0 ? (
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.buyRequestMineEmpty}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <RequestCard
              key={row.id}
              row={row}
              action={
                row.status === "open"
                  ? { label: t.buyRequestFound, busy: busyId === row.id, onClick: () => close(row) }
                  : undefined
              }
            />
          ))}
        </div>
      )}
      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
    </section>
  );
}

export function IncomingBuyRequests({ hideTitle = false }: { hideTitle?: boolean }) {
  const { t, user } = useApp();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<BuyRequestRow[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    void api<{ requests?: BuyRequestRow[] }>("/api/purchase-requests/incoming").then((res) => {
      if (cancel) return;
      setRows(res.ok ? res.data?.requests ?? [] : []);
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [userId]);

  if (!userId) return null;

  const write = (row: BuyRequestRow) => {
    setBusyId(row.id);
    setError("");
    void api<{ id?: string }>(`/api/purchase-requests/${encodeURIComponent(row.id)}/chat`, { method: "POST" }).then((res) => {
      setBusyId("");
      if (!res.ok || !res.data?.id) {
        setError(res.error === "blocked" ? t.chatBlocked : t.buyRequestFail);
        return;
      }
      router.push(`/chat/${res.data.id}`);
    });
  };

  return (
    <section data-testid="incoming-buy-requests">
      {hideTitle ? null : <h2 className="font-display text-[19px] font-bold text-ink">{t.buyRequestIncoming}</h2>}
      {!ready ? null : rows.length === 0 ? (
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.buyRequestIncomingEmpty}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <RequestCard
              key={row.id}
              row={row}
              action={
                row.status === "open" ? { label: t.buyRequestWrite, busy: busyId === row.id, onClick: () => write(row) } : undefined
              }
            />
          ))}
        </div>
      )}
      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
    </section>
  );
}
