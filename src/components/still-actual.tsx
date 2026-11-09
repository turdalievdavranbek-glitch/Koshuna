"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { listingNeedsRefresh } from "@/lib/freshness";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";

/** Quiet «Ещё актуально?» for the owner. «Снять» is the existing take-down. Nothing is deleted on its own. */
export function StillActual({ listing, compact }: { listing: Listing; compact?: boolean }) {
  const { t, updateListing, clearMeetDeal, noteListingFresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);

  if (gone || !listingNeedsRefresh(listing)) return null;

  const yes = () => {
    setBusy(true);
    setError("");
    void api(`/api/listings/${encodeURIComponent(listing.id)}/confirm`, { method: "POST" }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(t.stillFailed);
        return;
      }
      noteListingFresh(listing.id);
      setGone(true);
    });
  };

  const takeDown = () => {
    updateListing(listing.id, { status: "withdrawn", closedKind: undefined, reservedBy: undefined });
    clearMeetDeal(listing.id);
    setGone(true);
  };

  return (
    <div
      data-testid="still-actual"
      className={compact ? "border-t border-line px-3.5 py-2.5" : "mt-3 rounded-[14px] bg-[#F7F1E8] px-3.5 py-3"}
    >
      <p className="text-[13px] leading-[1.4] text-muted">{t.stillAsk}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          data-testid="still-yes"
          disabled={busy}
          onClick={yes}
          className="h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-screen disabled:opacity-60"
        >
          {t.stillYes}
        </button>
        <button
          type="button"
          data-testid="still-hide"
          disabled={busy}
          onClick={takeDown}
          className="h-9 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          {t.ownerWithdraw}
        </button>
      </div>
      {error ? <p className="mt-2 text-[12px] text-accent">{error}</p> : null}
    </div>
  );
}
