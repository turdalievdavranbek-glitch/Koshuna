"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { listingMapPath, mapPointPath, twoGisUrl } from "@/lib/geo";
import { useApp } from "@/lib/store";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

export function GisOnMapCard({
  city,
  lat,
  lng,
  listingId,
  label,
  compact,
  showHint,
}: {
  city: string;
  lat: number;
  lng: number;
  listingId?: string;
  label?: string;
  compact?: boolean;
  showHint?: boolean;
}) {
  const { t } = useApp();
  const href = listingId ? listingMapPath(listingId) : mapPointPath(lat, lng, city);

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white">
      <div className={`pointer-events-none relative z-0 ${compact ? "h-[132px]" : "h-44"}`}>
        <GisMap
          center={{ lat, lng }}
          zoom={15}
          pick={{ lat, lng }}
          markers={[{ id: listingId || "pin", lat, lng, active: true, label }]}
          interactive={false}
        />
      </div>
      {showHint ? <p className="relative z-10 px-3.5 pt-3 text-[13px] leading-[1.4] text-muted">{t.publishedOnMap}</p> : null}
      <div className="relative z-10 flex gap-2 p-3">
        <Link
          href={href}
          className="shadow-btn flex h-11 flex-1 items-center justify-center rounded-2xl bg-accent text-[13px] font-semibold text-accent-on"
        >
          {t.viewOnMap}
        </Link>
        <a
          href={twoGisUrl(city, lng, lat)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-2xl border border-line bg-white px-3 text-[13px] font-semibold text-ink"
        >
          {t.open2gis}
        </a>
      </div>
    </div>
  );
}
