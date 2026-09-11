"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { LocationLine } from "@/components/location-line";
import { PhoneShell } from "@/components/shell";

export default function DealersPage() {
  const { t, dealerProfiles, allListings, city } = useApp();
  const router = useRouter();
  const list = useMemo(
    () =>
      dealerProfiles.filter((row) => {
        if (!row.verified) return false;
        if (city !== "all" && row.city && row.city !== city) return false;
        return true;
      }),
    [dealerProfiles, city],
  );

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/section/cars")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.dealersTitle}</h1>
          <span className="w-9" />
        </div>
        <LocationLine className="mt-2" />
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[13px] leading-[1.45] text-muted">{t.dealersHint}</p>
        <div className="mt-4 flex flex-col gap-3">
          {list.length ? (
            list.map((row) => {
              const stock = allListings.filter(
                (item) => item.dealerId === row.id && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed",
              ).length;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => router.push(`/dealers/${row.slug}`)}
                  className="rounded-[18px] border border-line bg-white px-3.5 py-3.5 text-left"
                >
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-[#F3E0D9] px-2 py-0.5 text-[10px] font-bold text-accent-dark">
                      {row.verified ? t.dealerVerified : t.dealerBadge}
                    </span>
                  </div>
                  <div className="mt-1.5 font-display text-[17px] font-bold text-ink">{row.companyName}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {t.cities[row.city] ?? row.city}
                    {row.address ? ` · ${row.address}` : ""}
                    {row.hours ? ` · ${row.hours}` : ""}
                    {stock ? ` · ${t.nListings(stock)}` : ""}
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-[13px] text-muted">{t.empty}</p>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
