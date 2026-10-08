"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";

type HoldStatus = "requested" | "confirmed" | "cancelled" | "released" | "expired";

const LIVE = new Set(["active", "promoted"]);

export function HoldRequest({ listing }: { listing: Listing }) {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<HoldStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId || !LIVE.has(listing.status) || listing.ownerId === userId) {
      setStatus(null);
      return;
    }
    let cancel = false;
    void api<{ hold?: { status?: HoldStatus } | null }>(`/api/listings/${encodeURIComponent(listing.id)}/hold`).then((res) => {
      if (cancel) return;
      const next = res.ok ? res.data?.hold?.status ?? null : null;
      setStatus(next ?? null);
    });
    return () => {
      cancel = true;
    };
  }, [userId, listing.id, listing.ownerId, listing.status]);

  if (!LIVE.has(listing.status)) return null;
  if (userId && listing.ownerId === userId) return null;

  const ask = () => {
    if (!user) {
      setPendingPath(`/listing/${listing.id}`);
      router.push("/login");
      return;
    }
    setBusy(true);
    setError("");
    void api<{ hold?: { status?: HoldStatus } }>(`/api/listings/${encodeURIComponent(listing.id)}/hold`, { method: "POST" }).then((res) => {
      setBusy(false);
      const next = res.data?.hold?.status;
      if (!res.ok || !next) {
        setError(t.holdFailed);
        return;
      }
      setStatus(next);
    });
  };

  if (status === "confirmed") {
    return (
      <p data-testid="hold-answer" className="mt-3 text-[14px] font-semibold leading-[1.4] text-success-ink">
        {t.holdYes}
      </p>
    );
  }

  if (status === "requested") {
    return (
      <p data-testid="hold-answer" className="mt-3 text-[14px] leading-[1.4] text-muted">
        {t.holdPending}
      </p>
    );
  }

  return (
    <div className="mt-3">
      {status === "cancelled" ? <p className="mb-2 text-[14px] leading-[1.4] text-muted">{t.holdNo}</p> : null}
      <button
        type="button"
        data-testid="hold-ask"
        disabled={busy}
        onClick={ask}
        className="h-12 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink disabled:opacity-60"
      >
        {t.holdAsk}
      </button>
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
    </div>
  );
}
