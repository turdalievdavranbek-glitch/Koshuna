"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { DISTRICTS } from "@/lib/data";
import { districtLabel } from "@/lib/geo";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { refreshCourierBadge } from "./courier-badge";
import { deliveryError } from "./delivery-ui";

type CourierApp = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  district: string;
  transport: string;
  status: string;
  email: string;
  city?: string | null;
  placeDistrict?: string | null;
};

function CourierShot({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <img src={src} alt={label} className="max-h-[60vh] w-full max-w-full object-contain" />
        <span className="mt-1 block text-[12px] font-semibold text-accent">{label}</span>
      </button>
      {open ? (
        <button type="button" aria-label={label} onClick={() => setOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-3">
          <img src={src} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </>
  );
}

type Blocked = { id: string; name: string; email: string; phone: string; refusals: number };
type Stuck = { id: string; no: number; status: string; flag: string | null; codeFails: number; shopName: string };

/** Owner or admin: pending and approved courier applications. */
export function CourierReview() {
  const { t, lang, user } = useApp();
  const allowed = Boolean(user?.owner);
  const [rows, setRows] = useState<CourierApp[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void api<{ couriers?: CourierApp[] }>("/api/admin/couriers").then((res) => {
      setRows(res.ok && Array.isArray(res.data?.couriers) ? res.data.couriers : []);
    });
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed) return null;

  const review = (id: string, action: "approve" | "revoke") => {
    setBusy(id);
    setError("");
    void api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "POST", json: { action } }).then((res) => {
      setBusy("");
      if (!res.ok) {
        setError(deliveryError(res.error, t));
        return;
      }
      refreshCourierBadge();
      load();
    });
  };

  const transport = (value: string) => (value === "car" ? t.deliveryCar : value === "moto" ? t.deliveryMoto : t.deliveryWalk);
  const placeLine = (row: CourierApp) => {
    const city = row.city ? t.cities[row.city] || row.city : t.deliveryNoCity;
    const area = DISTRICTS.find((item) => item.id === row.placeDistrict);
    return area ? `${city} · ${districtLabel(area, lang)}` : city;
  };

  return (
    <div className="mt-5" data-testid="courier-review">
      <div className="text-[13px] font-semibold uppercase text-muted">{t.deliveryAdminCouriers}</div>
      {rows && rows.length === 0 ? <div className="mt-2 text-[13px] text-muted">{t.deliveryNoApps}</div> : null}
      <div className="mt-2 flex flex-col gap-2">
        {(rows ?? []).map((row) => (
          <div key={row.id} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
            <div className="text-[15px] font-semibold text-ink">{row.name}</div>
            <div className="text-[12px] text-muted">
              {row.phone} · {row.district} · {transport(row.transport)}
            </div>
            <div className="text-[12px] font-semibold text-ink">{placeLine(row)}</div>
            <div className="text-[12px] text-muted">{row.email}</div>
            <div className="mt-2 flex flex-col gap-3">
              <CourierShot src={`/api/admin/couriers/${row.id}/photo?kind=passport`} label={t.deliveryPassport} />
              <CourierShot src={`/api/admin/couriers/${row.id}/photo?kind=selfie`} label={t.deliverySelfie} />
            </div>
            <div className="mt-2 flex gap-2">
              {row.status === "pending" ? (
                <button type="button" disabled={busy === row.id} onClick={() => review(row.id, "approve")} className="h-9 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen disabled:opacity-40">
                  {t.deliveryApprove}
                </button>
              ) : row.status === "approved" ? (
                <button type="button" disabled={busy === row.id} onClick={() => review(row.id, "revoke")} className="h-9 flex-1 rounded-xl border border-line text-[13px] font-semibold text-accent disabled:opacity-40">
                  {t.deliveryRevokeCourier}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
    </div>
  );
}

/** Кабинет, admin only: stuck orders and buyers blocked after two refusals. The courier badge is not granted here. */
export function CourierAdmin() {
  const { t, user } = useApp();
  const admin = isAdminUser(user);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [stuck, setStuck] = useState<Stuck[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void api<{ buyers?: Blocked[] }>("/api/admin/order-blocks").then((res) => {
      setBlocked(res.ok && Array.isArray(res.data?.buyers) ? res.data.buyers : []);
    });
    void api<{ orders?: Stuck[] }>("/api/admin/delivery-stuck").then((res) => {
      setStuck(res.ok && Array.isArray(res.data?.orders) ? res.data.orders : []);
    });
  }, []);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  if (!admin) return null;

  const open = (id: string) => {
    setBusy(id);
    void api(`/api/admin/order-blocks/${encodeURIComponent(id)}`, { method: "POST", json: {} }).then(() => {
      setBusy("");
      load();
    });
  };

  return (
    <div className="mt-5">
      <div className="text-[13px] font-semibold uppercase text-muted">{t.deliveryStuck}</div>
      {stuck && stuck.length === 0 ? <div className="mt-2 text-[13px] text-muted">{t.deliveryStuckEmpty}</div> : null}
      <div className="mt-2 flex flex-col gap-2">
        {(stuck ?? []).map((row) => (
          <div key={row.id} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
            <div className="text-[15px] font-semibold text-ink">№{row.no} · {row.shopName}</div>
            <div className="text-[12px] text-muted">{row.flag || row.status}{row.codeFails >= 5 ? ` · ${t.deliveryCodeLocked}` : ""}</div>
            <div className="mt-2 flex gap-2">
              {row.codeFails >= 5 || row.flag === "code_locked" ? (
                <button type="button" disabled={busy === row.id} onClick={() => {
                  setBusy(row.id);
                  void api("/api/admin/delivery-stuck", { method: "POST", json: { id: row.id, action: "unlock" } }).then((res) => {
                    setBusy("");
                    if (!res.ok) setError(deliveryError(res.error, t));
                    else load();
                  });
                }} className="h-9 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen disabled:opacity-40">
                  {t.deliveryUnlockCode}
                </button>
              ) : null}
              {row.flag ? (
                <button type="button" disabled={busy === row.id} onClick={() => {
                  setBusy(row.id);
                  void api("/api/admin/delivery-stuck", { method: "POST", json: { id: row.id, action: "clear" } }).then((res) => {
                    setBusy("");
                    if (!res.ok) setError(deliveryError(res.error, t));
                    else load();
                  });
                }} className="h-9 flex-1 rounded-xl border border-line text-[13px] font-semibold disabled:opacity-40">
                  {t.deliveryClearFlag}
                </button>
              ) : null}
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
      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
    </div>
  );
}
