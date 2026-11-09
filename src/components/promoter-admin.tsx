"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { Input } from "./ui";

type Promoter = { id: string; name: string; email: string; points: number; listings: number };

/** Кабинет, admin only: «Назначить промоутера» + list of promoters with «Отозвать». */
export function PromoterAdmin() {
  const { t, user } = useApp();
  const router = useRouter();
  const admin = isAdminUser(user);
  const [rows, setRows] = useState<Promoter[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revoke, setRevoke] = useState<Promoter | null>(null);

  const load = useCallback(() => {
    void api<{ promoters?: Promoter[] }>("/api/admin/promoters").then((res) => {
      setRows(res.ok && Array.isArray(res.data?.promoters) ? res.data.promoters : []);
    });
  }, []);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  if (!admin) return null;

  const assign = () => {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError("");
    void api<{ ok?: boolean; error?: string }>("/api/admin/promoters", { method: "POST", json: { email: email.trim() } }).then((res) => {
      setBusy(false);
      if (res.ok && res.data?.ok) {
        setSheet(false);
        setEmail("");
        load();
        return;
      }
      const code = res.data?.error;
      setError(code === "no-user" || code === "bad-email" ? t.promoErrNotFound : code === "already" ? t.promoErrAlready : t.promoErrFail);
    });
  };

  const confirmRevoke = () => {
    if (!revoke || busy) return;
    setBusy(true);
    void api(`/api/admin/users/${encodeURIComponent(revoke.id)}/master`, { method: "POST", json: { on: false } }).then(() => {
      setBusy(false);
      setRevoke(null);
      load();
    });
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => {
          setSheet(true);
          setError("");
        }}
        className="w-full rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
      >
        <div className="text-[15px] font-bold text-ink">✔ {t.promoAssignCard}</div>
        <div className="mt-0.5 text-[12px] leading-[1.4] text-muted">{t.promoAssignHint}</div>
      </button>

      <div className="mt-4 text-[13px] font-semibold uppercase text-muted">{t.promoList}</div>
      {rows && rows.length === 0 ? <div className="mt-2 text-[13px] text-muted">{t.promoEmpty}</div> : null}
      <div className="mt-2 flex flex-col gap-2">
        {(rows ?? []).map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <button type="button" onClick={() => router.push(`/admin/users/${row.id}`)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[15px] font-semibold text-ink">{row.name || row.email}</div>
              <div className="truncate text-[12px] text-muted">{row.email}</div>
              <div className="text-[12px] text-muted">{t.promoCounts(row.points, row.listings)}</div>
            </button>
            <button type="button" onClick={() => setRevoke(row)} className="h-9 shrink-0 rounded-xl border border-line px-3 text-[13px] font-semibold text-accent">
              {t.promoRevoke}
            </button>
          </div>
        ))}
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-[520px] rounded-t-[22px] bg-screen p-4 pb-[calc(16px+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="text-[17px] font-bold text-ink">{t.promoEmailAsk}</div>
            <div className="mt-3">
              <Input value={email} onChange={setEmail} placeholder="name@gmail.com" />
            </div>
            {error ? <div className="mt-2 text-[13px] font-semibold text-accent">{error}</div> : null}
            <button type="button" disabled={busy || !email.trim()} onClick={assign} className="mt-3 h-12 w-full rounded-xl bg-ink text-[15px] font-semibold text-screen disabled:opacity-40">
              {t.promoAssign}
            </button>
          </div>
        </div>
      ) : null}

      {revoke ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6" onClick={() => setRevoke(null)}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-[400px] rounded-[20px] bg-screen p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-[15px] font-semibold leading-[1.4] text-ink">{t.promoRevokeAsk(revoke.name || revoke.email)}</div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={confirmRevoke} className="h-11 flex-1 rounded-xl bg-ink text-[14px] font-semibold text-screen disabled:opacity-40">
                {t.promoRevoke}
              </button>
              <button type="button" onClick={() => setRevoke(null)} className="h-11 flex-1 rounded-xl border border-line text-[14px] font-semibold">
                {t.transferCancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
