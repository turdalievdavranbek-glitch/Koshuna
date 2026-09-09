"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS } from "@/lib/deal";
import type { Listing, ReportReason } from "@/lib/types";
import { useApp } from "@/lib/store";

export function ReportListing({ listing }: { listing: Listing }) {
  const { t, reports, reportListing, user, setPendingPath } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ReportReason | null>(null);
  const already = Boolean(reports[listing.id]);

  if (already) {
    return <p className="mt-5 text-center text-[13px] font-semibold text-muted">{t.reportThanks}</p>;
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setPendingPath(`/listing/${listing.id}`);
            router.push("/login");
            return;
          }
          setOpen((v) => !v);
        }}
        className="w-full text-center text-[13px] font-semibold text-muted"
      >
        {t.report}
      </button>
      {open ? (
        <div className="mt-3 rounded-[18px] border border-line bg-white p-4">
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
        </div>
      ) : null}
    </div>
  );
}
