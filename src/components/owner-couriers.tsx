"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import { PhoneShell } from "./shell";
import { PageHead } from "./delivery-ui";
import { refreshCourierBadge } from "./courier-badge";
import { CourierShot } from "./courier-shot";
import { CourierReasonForm } from "./courier-reason-form";

type Row = {
  id: string;
  name: string;
  phone: string;
  district: string;
  status: "pending" | "approved" | "revoked";
  online: boolean;
  paused: boolean;
  delivered: number;
  reviewedAt: string | null;
  rejectReason?: string | null;
};

type Tab = "pending" | "approved" | "revoked";

function stamp(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Bishkek",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function OwnerCouriersScreen() {
  const { t } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void api<{ couriers?: Row[] }>("/api/owner/couriers").then((res) => {
      setRows(res.ok && Array.isArray(res.data?.couriers) ? res.data.couriers : []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = (rows ?? []).filter((row) => row.status === tab);
  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: t.ownerTabApps },
    { id: "approved", label: t.ownerTabCouriers },
    { id: "revoked", label: t.ownerTabRevoked },
  ];

  const revoke = (id: string, reason: string) => {
    setBusy(id);
    setError("");
    void api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "POST", json: { action: "revoke", reason } }).then((res) => {
      setBusy("");
      setConfirm("");
      if (!res.ok) {
        setError(res.error === "reason" ? t.courierRejectNeed : res.error === "active" ? t.deliveryActiveOrder : t.deliveryFail);
        return;
      }
      refreshCourierBadge();
      load();
    });
  };

  return (
    <PhoneShell>
      <PageHead title={t.ownerCouriersTitle} fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setConfirm("");
              }}
              className={`h-10 flex-1 rounded-xl text-[13px] font-bold ${tab === item.id ? "bg-ink text-screen" : "border border-line bg-white text-ink"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {rows && visible.length === 0 ? <p className="mt-4 text-[14px] text-muted">{t.ownerNone}</p> : null}
        <div className="mt-3 flex flex-col gap-2">
          {visible.map((row) => (
            <div key={row.id} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
              <div className="text-[15px] font-semibold text-ink">{row.name}</div>
              <div className="text-[13px] text-muted">{row.phone}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <CourierShot id={row.id} kind="passport" label={t.deliveryPassport} />
                <CourierShot id={row.id} kind="selfie" label={t.deliverySelfie} />
              </div>
              {row.district ? <div className="text-[12px] text-muted">{row.district}</div> : null}
              {tab === "approved" ? (
                <>
                  <div className="mt-1 text-[12px] text-ink">
                    {t.ownerApprovedAt}: {stamp(row.reviewedAt)}
                  </div>
                  <div className="text-[12px] font-semibold text-ink">
                    {row.paused ? t.ownerPaused : row.online ? t.ownerOnline : t.ownerOffline}
                    {" · "}
                    {t.ownerDelivered}: {row.delivered}
                  </div>
                  {confirm === row.id ? (
                    <CourierReasonForm busy={busy === row.id} onCancel={() => setConfirm("")} onSubmit={(reason) => revoke(row.id, reason)} />
                  ) : (
                    <button type="button" onClick={() => setConfirm(row.id)} className="mt-2 h-9 w-full rounded-xl border border-line text-[13px] font-semibold text-accent">
                      {t.ownerRemove}
                    </button>
                  )}
                </>
              ) : null}
              {tab === "revoked" && row.rejectReason ? (
                <p className="mt-1 text-[13px] text-ink">
                  {t.courierRejectSaved}: {row.rejectReason}
                </p>
              ) : null}
              {tab === "pending" ? (
                <button type="button" onClick={() => router.push("/courier/review")} className="mt-2 text-[13px] font-semibold text-accent">
                  {t.ownerOpenReview}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {error ? <p className="mt-3 text-[13px] font-semibold text-accent">{error}</p> : null}
      </div>
    </PhoneShell>
  );
}
