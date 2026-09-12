"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CIRCLE_TTL_MS, pickNeighborCircles } from "@/lib/circles";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { ListingThumb } from "./listing-media";

export function NeighborCircles({ listings }: { listings: Listing[] }) {
  void listings;
  const { t, lang, city, filters, allListings, comments, reactions } = useApp();
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), CIRCLE_TTL_MS);
    return () => window.clearInterval(id);
  }, []);

  const { listings: videos, widened } = useMemo(
    () =>
      pickNeighborCircles(
        allListings,
        { city, oblast: filters.oblast },
        reactions,
        comments,
      ),
    [allListings, city, filters.oblast, comments, reactions, tick],
  );

  if (videos.length === 0) return null;

  return (
    <div className="mt-1" data-testid="neighbor-circles">
      <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.homeCircles}</h2>
      <div className="sc mt-2.5 flex gap-3 overflow-x-auto pb-1">
        {videos.map((item) => {
          const title = listingTitle(item, lang);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(`/listing/${item.id}`)}
              className="flex w-[76px] shrink-0 flex-col items-center text-center"
            >
              <ListingThumb listing={item} alt={title} compact className="w-[68px]" />
              <div className="mt-1.5 w-full truncate text-[11px] font-bold text-ink">{formatSom(item.price)}</div>
              <div className="w-full truncate text-[10px] leading-[1.2] text-muted">{t.cities[item.city]}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] leading-[1.3] text-muted-2">
        {widened ? t.homeCirclesWiden : t.homeCirclesHint}
      </p>
    </div>
  );
}
