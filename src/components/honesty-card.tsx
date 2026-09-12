"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { HonestyScore, Listing } from "@/lib/types";

const STARS: HonestyScore[] = [1, 2, 3, 4, 5];

export function HonestyCard({ listing }: { listing: Listing }) {
  const { t, user, setPendingPath, honestyOf, rateHonesty } = useApp();
  const router = useRouter();
  const { avg, count, mine } = honestyOf(listing.id);

  return (
    <div className="mt-6 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.honestyTitle}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.honestyHint}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-[22px] font-bold text-ink">{t.honestyAvg(avg)}</div>
          <div className="mt-0.5 text-[12px] text-muted">{t.honestyCount(count)}</div>
        </div>
        <div className="flex gap-1">
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={Boolean(mine)}
              aria-label={`${t.honestyRate} ${n}`}
              onClick={() => {
                if (!user) {
                  setPendingPath(`/listing/${listing.id}`);
                  router.push("/login");
                  return;
                }
                rateHonesty(listing.id, n);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[16px]"
              style={{
                background: mine && mine >= n ? "#17140F" : "#F4EFE6",
                color: mine && mine >= n ? "#F7F3EC" : "#17140F",
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      {mine ? <p className="mt-2 text-[12px] font-semibold text-success-ink">{t.honestyThanks}</p> : null}
    </div>
  );
}
