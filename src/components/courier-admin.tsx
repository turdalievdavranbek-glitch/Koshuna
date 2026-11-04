"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { refreshCourierBadge } from "./courier-badge";

type CourierApp = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  district: string;
  transport: string;
  status: string;
  email: string;
};

type Blocked = { id: string; name: string; email: string; phone: string; refusals: number };

/** Кабинет, admin only: approve or revoke couriers, and open ordering again after two refusals. */
export function CourierAdmin() {
  const { t, user } = useApp();
  const admin = isAdminUser(user);
  const [rows, setRows] = useState<CourierApp[] | null>(null);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    void api<{ couriers?: CourierApp[] }>("/api/admin/couriers").then((res) => {
      setRows(res.ok && Array.isArray(res.data?.couriers) ? res.data.couriers : []);
    });
    void api<{ buyers?: Blocked[] }>("/api/admin/order-blocks").then((res) => {
      setBlocked(res.ok && Array.isArray(res.data?.buyers) ? res.data.buyers : []);
    });
  }, []);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  if (!admin) return null;

  const review = (id: string, action: "approve" | "revoke") => {
    setBusy(id);
    void api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "POST", json: { action } }).then(() => {
      setBusy("");
      refreshCourierBadge();
      load();
    });
  };

  const open = (id: string) => {
    setBusy(id);
    void api(`/api/admin/order-blocks/${encodeURIComponent(id)}`, { method: "POST", json: {} }).then(() => {
      setBusy("");
      load();
    });
  };

  const transport = (value: string) => (value === "car" ? t.deliveryCar : value === "moto" ? t.deliveryMoto : t.deliveryWalk);

  return (
    <div className="mt-5">
      <div className="text-[13px] font-semibold uppercase text-muted">{t.deliveryAdminCouriers}</div>
      {rows && rows.length === 0 ? <div className="mt-2 text-[13px] text-muted">{t.deliveryNoApps}</div> : null}
      <div className="mt-2 flex flex-col gap-2">
        {(rows ?? []).map((row) => (
          <div key={row.id} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
            <div className="text-[15px] font-semibold text-ink">{row.name}</div>
            <div className="text-[12px] text-muted">
              {row.phone} · {row.district} · {transport(row.transport)}
            </div>
            <div className="text-[12px] text-muted">{row.email}</div>
            <div className="mt-2 flex gap-2">
              <a href={`/api/admin/couriers/${row.id}/photo?kind=passport`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-accent">
                {t.deliveryPassport}
              </a>
              <a href={`/api/admin/couriers/${row.id}/photo?kind=selfie`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-accent">
                {t.deliverySelfie}
              </a>
            </div>
            <div className="mt-2 flex gap-2">
              {row.status !== "approved" ? (
                <button type="button" disabled={busy === row.id} onClick={() => review(row.id, "approve")} className="h-9 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen disabled:opacity-40">
                  {t.deliveryApprove}
                </button>
              ) : (
                <button type="button" disabled={busy === row.id} onClick={() => review(row.id, "revoke")} className="h-9 flex-1 rounded-xl border border-line text-[13px] font-semibold text-accent disabled:opacity-40">
                  {t.deliveryRevokeCourier}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[13px] font-semibold uppercase text-muted">{t.deliveryBlockedBuyers}</div>
      {blocked && blocked.length === 0 ? <div className="mt-2 text-[13px] text-muted">{t.deliveryNoBlocked}</div> : null}
      <div className="mt-2 flex flex-col gap-2">
        {(blocked ?? []).map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-ink">{row.name || row.email || row.phone}</div>
              <div className="truncate text-[12px] text-muted">{row.phone || row.email}</div>
            </div>
            <button type="button" disabled={busy === row.id} onClick={() => open(row.id)} className="h-9 shrink-0 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink disabled:opacity-40">
              {t.deliveryUnblock}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
