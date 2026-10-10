"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminAreaById, adminAreaLabel } from "@/lib/admin-areas";
import { api } from "@/lib/api/client";
import { buyRequestAmount, type BuyRequestRow } from "@/lib/buy-request";
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
  remove,
}: {
  row: BuyRequestRow;
  action?: { label: string; busy: boolean; onClick: () => void };
  remove?: { ask: boolean; busy: boolean; onAsk: () => void; onYes: () => void; onNo: () => void };
}) {
  const { t, lang } = useApp();
  const place = placeLabel(row, lang, t.oblasts);
  const closed = row.status !== "open";
  const amount = buyRequestAmount(row.quantity, row.unit, t.buyUnits);
  return (
    <div className="rounded-[16px] border border-line bg-white px-3.5 py-3">
      <div className="text-[15px] font-semibold leading-[1.35] text-ink">{row.buyerName?.trim() || row.text}</div>
      {row.buyerName ? <div className="mt-0.5 text-[14px] leading-[1.35] text-ink">{row.text}</div> : null}
      <div className="mt-1 text-[12px] leading-[1.4] text-muted">
        {[t.shopCats[row.category] ?? row.category, amount, place, dayLabel(row.deadline, lang), row.needsDelivery ? t.buyRequestWithDelivery : t.buyRequestNoDelivery]
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
      {remove ? (
        remove.ask ? (
          <div className="mt-2 rounded-[12px] bg-chip p-3">
            <p className="text-[13px] text-ink">{t.buyRequestDeleteAsk}</p>
            <div className="mt-2 flex gap-4">
              <button type="button" disabled={remove.busy} onClick={remove.onYes} className="text-[13px] font-bold text-accent disabled:opacity-60">
                {t.buyRequestDelete}
              </button>
              <button type="button" onClick={remove.onNo} className="text-[13px] font-semibold text-muted">
                {t.cardDeleteCancel}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" data-testid="buy-request-delete" onClick={remove.onAsk} className="mt-2 text-[14px] font-bold text-accent">
            {t.buyRequestDelete}
          </button>
        )
      ) : null}
    </div>
  );
}

export function MyBuyRequests() {
  const { t, user } = useApp();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<BuyRequestRow[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [askId, setAskId] = useState("");
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

  const remove = (row: BuyRequestRow) => {
    setBusyId(row.id);
    setError("");
    void api(`/api/me/purchase-requests/${encodeURIComponent(row.id)}/delete`, { method: "POST" }).then((res) => {
      setBusyId("");
      if (!res.ok) {
        setError(t.buyRequestFail);
        return;
      }
      setAskId("");
      setRows((list) => list.filter((item) => item.id !== row.id));
    });
  };

  return (
    <section data-testid="my-buy-requests">
      <h2 className="font-display text-[19px] font-bold text-ink">{t.buyRequestMine}</h2>
      <button
        type="button"
        data-testid="buy-request-new"
        onClick={() => router.push("/post?type=request")}
        className="mt-3 h-[52px] w-full rounded-2xl border border-accent text-[15px] font-semibold text-accent"
      >
        {t.buyRequestNew}
      </button>
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
              remove={{
                ask: askId === row.id,
                busy: busyId === row.id,
                onAsk: () => setAskId(row.id),
                onYes: () => remove(row),
                onNo: () => setAskId(""),
              }}
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
