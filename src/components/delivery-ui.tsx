"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { formatKm, type OrderStatus, type OrderView } from "@/lib/delivery";
import type { Dict } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { ScreenBack } from "./back-button";

/** Send a signed-out visitor to login once. Does not re-fire when the cabinet callback identity changes. */
export function useSignedIn(path: string) {
  const { user, setPendingPath } = useApp();
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (user) {
      sent.current = false;
      return;
    }
    if (sent.current) return;
    sent.current = true;
    setPendingPath(path);
    router.push("/login");
  }, [user, path, router, setPendingPath]);
  return user;
}

export function som(n: number): string {
  return formatSom(n);
}

export function deliveryError(code: string | undefined, t: Dict): string {
  if (code === "blocked") return t.deliveryBlocked;
  if (code === "taken") return t.deliveryTaken;
  if (code === "bad-code") return t.deliveryBadCode;
  if (code === "too-many" || code === "code-locked") return t.deliveryCodeLocked;
  if (code === "need-pay") return t.deliveryNeedPay;
  if (code === "offline") return t.deliveryOfflineNeed;
  if (code === "need-place") return t.deliveryNeedPlace;
  if (code === "busy") return t.deliveryBusy;
  if (code === "own") return t.deliveryOwn;
  if (code === "active") return t.deliveryActiveOrder;
  if (code === "bad-phone") return t.deliveryBadPhone;
  if (code === "bad-address") return t.deliveryBadAddress;
  if (code === "shop-closed") return t.deliveryShopClosed;
  if (code === "too-far") return t.deliveryTooFar;
  if (code === "price-changed") return t.deliveryPriceChanged;
  if (code === "stale") return t.deliveryGone;
  if (code === "city-locked") return t.deliveryCityLocked;
  if (code === "after-pickup") return t.deliveryAfterPickup;
  if (code === "state") return t.deliveryState;
  if (code === "empty") return t.deliveryEmpty;
  return t.deliveryFail;
}

export function orderStatusText(order: Pick<OrderView, "status" | "buyerConfirmed">, t: Dict): string {
  if (order.status === "assembled") return order.buyerConfirmed ? t.deliveryStatusWaitCourier : t.deliveryStatusWaitYou;
  const text: Record<OrderStatus, string> = {
    new: t.deliveryStatusNew,
    accepted: t.deliveryStatusAccepted,
    assembled: t.deliveryStatusAssembled,
    assigned: t.deliveryStatusAssigned,
    picked_up: t.deliveryStatusWay,
    delivered: t.deliveryStatusDone,
    rejected: t.deliveryStatusRejected,
    cancelled: t.deliveryStatusCancelled,
    refused: t.deliveryStatusRefused,
    returned: t.deliveryStatusReturned,
  };
  return text[order.status];
}

export function askPoint(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export function PageHead({ title, aside, fallback }: { title: string; aside?: ReactNode; fallback: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-1">
      <ScreenBack fallback={fallback} />
      <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-extrabold text-ink">{title}</h1>
      {aside}
    </div>
  );
}

export function RedBtn({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="shadow-btn h-[52px] w-full rounded-2xl bg-accent text-[16px] font-bold text-accent-on disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function YellowBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-12 w-full rounded-2xl bg-[#FFE14A] text-[16px] font-extrabold text-ink shadow-[0_4px_0_#E6C200] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-12 w-full rounded-2xl border border-line bg-white text-[15px] font-bold text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const TRACK = ["accepted", "assembled", "way", "done"] as const;

function trackAt(status: OrderStatus): number {
  if (status === "delivered") return 4;
  if (status === "picked_up") return 2;
  if (status === "assigned" || status === "assembled") return 1;
  if (status === "accepted") return 0;
  return -1;
}

export function OrderTracker({ status, t }: { status: OrderStatus; t: Dict }) {
  const at = trackAt(status);
  if (status === "rejected" || status === "cancelled" || status === "refused" || status === "returned" || status === "new") return null;
  const labels = [t.deliveryTrackAccepted, t.deliveryTrackBuilt, t.deliveryTrackWay, t.deliveryTrackDone];
  return (
    <div className="mt-4 flex items-start">
      {TRACK.map((id, index) => {
        const done = index < at;
        const current = index === at;
        return (
          <div key={id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-[3px] flex-1 ${index === 0 ? "bg-transparent" : done || current ? "bg-accent" : "bg-[#E4E4E9]"}`} />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  done ? "bg-accent text-white" : current ? "bg-[#FFE14A] text-ink" : "bg-[#F3F3F5] text-muted"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={`h-[3px] flex-1 ${index === TRACK.length - 1 ? "bg-transparent" : index < at ? "bg-accent" : "bg-[#E4E4E9]"}`} />
            </div>
            <div className={`mt-1 text-center text-[11px] font-semibold ${done || current ? "text-ink" : "text-muted"}`}>{labels[index]}</div>
          </div>
        );
      })}
    </div>
  );
}

export function FeeNote({ km, flat, t }: { km: number | null; flat: boolean; t: Dict }) {
  if (flat || km == null) return <span>{t.deliveryFeeFlat}</span>;
  return <span>{t.deliveryFeeLine(formatKm(km))}</span>;
}
