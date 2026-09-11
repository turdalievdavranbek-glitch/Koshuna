"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { twoGisUrl } from "@/lib/geo";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { ListingGrid } from "@/components/listing-grid";
import { PhoneShell } from "@/components/shell";

export default function DealerPublicPage() {
  const slug = useParams<{ slug: string }>().slug;
  const { t, dealerProfiles, allListings } = useApp();
  const router = useRouter();
  const dealer = dealerProfiles.find((row) => row.slug === slug);
  const cars = useMemo(
    () =>
      dealer
        ? allListings.filter(
            (item) =>
              item.dealerId === dealer.id &&
              item.status !== "draft" &&
              item.status !== "withdrawn" &&
              item.status !== "closed",
          )
        : [],
    [allListings, dealer],
  );

  if (!dealer || !dealer.verified) {
    return (
      <PhoneShell>
        <div className="p-5">
          <button type="button" onClick={() => router.push("/dealers")} className="text-[15px] font-semibold text-accent">
            {t.dealersTitle}
          </button>
          <p className="mt-4 text-muted">{t.empty}</p>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/dealers")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="max-w-[240px] truncate font-display text-[17px] font-bold text-ink">{dealer.companyName}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="rounded-[14px] bg-[#F3E0D9] px-3.5 py-2 text-[13px] font-bold text-accent-dark">
          {dealer.verified ? t.dealerVerified : t.dealerBadge}
        </div>
        <div className="mt-3 text-[15px] leading-[1.5] text-ink">{dealer.address}</div>
        <div className="mt-1 text-[13px] text-muted">
          {t.cities[dealer.city] ?? dealer.city}
          {dealer.hours ? ` · ${dealer.hours}` : ""}
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {dealer.phone}
          {dealer.website ? ` · ${dealer.website}` : ""}
        </div>
        {dealer.lng != null && dealer.lat != null ? (
          <a
            href={twoGisUrl(dealer.city, dealer.lng, dealer.lat)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-[13px] font-semibold text-accent"
          >
            {t.open2gis}
          </a>
        ) : null}
        <div className="mt-5">
          <div className="mb-3 font-display text-[19px] font-bold text-ink">{t.stockTitle}</div>
          {cars.length ? <ListingGrid listings={cars} /> : <p className="text-[13px] text-muted">{t.empty}</p>}
        </div>
      </div>
    </PhoneShell>
  );
}
