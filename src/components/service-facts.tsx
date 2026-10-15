"use client";

import { formatShopHours, nowInKg, shopOpenNow, type ShopHoursLabels } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";

function hourLabels(t: {
  dayMon: string;
  dayTue: string;
  dayWed: string;
  dayThu: string;
  dayFri: string;
  daySat: string;
  daySun: string;
  hoursDaily: string;
  hours24: string;
}): ShopHoursLabels {
  return {
    days: {
      mon: t.dayMon,
      tue: t.dayTue,
      wed: t.dayWed,
      thu: t.dayThu,
      fri: t.dayFri,
      sat: t.daySat,
      sun: t.daySun,
    },
    daily: t.hoursDaily,
    allDay: t.hours24,
  };
}

/** Visit chip, address, hours and open/closed for a services listing. */
export function ServiceFacts({ listing, compact }: { listing: Listing; compact?: boolean }) {
  const { t } = useApp();
  if (listing.section !== "services") return null;
  const hours = formatShopHours(listing.hours, hourLabels(t));
  const open = hours ? shopOpenNow(listing.hours, nowInKg()) : null;
  const visit = listing.serviceMode === "mobile";
  const area = listing.serviceArea === "district" ? t.serviceAreaDistrict : listing.serviceArea === "city" ? t.serviceAreaCity : "";
  const address = !visit && listing.address ? listing.address : "";
  if (!visit && !address && !hours) return null;
  return (
    <div data-testid="service-facts" className={compact ? "mt-1 flex flex-col gap-0.5" : "mt-3 flex flex-col gap-1.5"}>
      {visit ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span data-testid="service-visit" className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-bold text-ink">
            {t.serviceVisit}
          </span>
          {area ? (
            <span data-testid="service-area-label" className="text-[12px] text-muted">
              {area}
            </span>
          ) : null}
        </div>
      ) : address ? (
        <div data-testid="service-address" className={`text-muted ${compact ? "text-[12px]" : "text-[14px]"}`}>
          {address}
        </div>
      ) : null}
      {hours ? (
        <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "text-[12px]" : "text-[14px]"}`}>
          <span data-testid="service-hours" className="text-ink">
            {hours}
          </span>
          {open === true ? <span className="font-bold text-success">{t.shopOpenNow}</span> : null}
          {open === false ? <span className="font-bold text-muted">{t.shopClosedNow}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
