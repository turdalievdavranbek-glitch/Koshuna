"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CIRCLE_TTL_MS, pickNeighborCircles, resetCircleCache } from "@/lib/circles";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { listingsForSearch } from "@/lib/search-browse";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { ListingThumb } from "./listing-media";

export function NeighborCircles({ listings }: { listings: Listing[] }) {
  void listings;
  const { t, lang, city, filters, allListings, comments, reactions, shops } = useApp();
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const scopeCity = filters.city && filters.city !== "all" ? filters.city : city;
  const scopeOblast = filters.oblast;
  const scopeKey = `${scopeCity}|${scopeOblast}`;
  const prevScope = useRef<string | null>(null);

  useEffect(() => {
    if (prevScope.current !== null && prevScope.current !== scopeKey) {
      resetCircleCache();
      setTick((n) => n + 1);
    }
    prevScope.current = scopeKey;
  }, [scopeKey]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), CIRCLE_TTL_MS);
    return () => window.clearInterval(id);
  }, []);

  const videos = useMemo(() => {
    void tick; // hourly timer: recompute so a cached circle can expire
    const picked = pickNeighborCircles(allListings, { city: scopeCity, oblast: scopeOblast }, reactions, comments, Date.now(), false).listings;
    return listingsForSearch(picked, shops);
  }, [allListings, scopeCity, scopeOblast, comments, reactions, shops, tick]);

  return (
    <div data-testid="neighbor-circles">
      {videos.length === 0 ? (
        <p className="text-[12px] leading-[1.35] text-muted" data-testid="circles-empty">
          {t.homeCirclesEmpty}
        </p>
      ) : (
        <div className="sc flex gap-2.5 overflow-x-auto pb-0.5">
          {videos.map((item) => {
            const title = listingTitle(item, lang);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/listing/${item.id}`)}
                className="flex w-[76px] shrink-0 flex-col items-center text-center"
              >
                <ListingThumb listing={item} alt={title} compact playInline circle className="w-[60px]" />
                <div className="mt-1 w-full truncate text-[12px] font-bold leading-[1.2] text-ink">{title}</div>
                <div className="w-full truncate text-[12px] leading-[1.2] text-muted">
                  {formatSom(item.price)} · {t.cities[item.city]}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1.5 text-[12px] font-semibold leading-[1.3] text-ink" data-testid="circles-caption">
        {t.homeCirclesCaption}
      </p>
    </div>
  );
}
