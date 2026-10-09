"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS } from "@/lib/deal";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import type { Listing, ReportReason } from "@/lib/types";
import { useApp } from "@/lib/store";

export function ReportListing({ listing, returnTo, sheet }: { listing: Listing; returnTo?: string; sheet?: boolean }) {
  const { t, reports, reportListing, user, setPendingPath } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ReportReason | null>(null);
  const already = Boolean(reports[listing.id]);
  const backTo = returnTo || `/listing/${listing.id}`;

  useEffect(() => {
    if (!sheet || !open) return;
    const id = `report-${listing.id}`;
    pushOverlay(id, () => setOpen(false));
    return () => removeOverlay(id);
  }, [sheet, open, listing.id]);

  if (already) {
    return <p className={sheet ? "text-center text-[13px] font-semibold text-white/80" : "mt-5 text-center text-[13px] font-semibold text-muted"}>{t.reportThanks}</p>;
  }

  const reasons = (
    <>
      <div className="font-display text-[17px] font-bold text-ink">{t.reportTitle}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.reportHint}</p>
      <div className="mt-3 flex flex-col gap-1.5">
        {REPORT_REASONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPicked(id)}
            className="rounded-[14px] px-3.5 py-3 text-left text-[14px] font-semibold"
            style={{
              background: picked === id ? "#17140F" : "#F7F3EC",
              color: picked === id ? "#F7F3EC" : "#17140F",
            }}
          >
            {t.reportReasons[id]}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!picked}
        onClick={() => {
          if (!picked) return;
          reportListing(listing.id, picked);
          setOpen(false);
        }}
        className="mt-3 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-40"
      >
        {t.report}
      </button>
    </>
  );

  return (
    <div className={sheet ? "" : "mt-5"}>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setPendingPath(backTo);
            router.push("/login");
            return;
          }
          setOpen((v) => !v);
        }}
        className={sheet ? "text-[13px] font-semibold text-white/85" : "w-full text-center text-[13px] font-semibold text-muted"}
      >
        {t.report}
      </button>
      {open && sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(23,20,15,.45)] desk:items-center desk:p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-[24px] bg-white px-5 pb-8 pt-5 desk:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
            {reasons}
            <button type="button" onClick={() => setOpen(false)} className="mt-2 h-12 w-full text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
      {open && !sheet ? <div className="mt-3 rounded-[18px] border border-line bg-white p-4">{reasons}</div> : null}
    </div>
  );
}
