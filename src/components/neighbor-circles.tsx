"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import {
  CIRCLE_TTL_MS,
  circleScopeFrom,
  circlesFromIds,
  listingInCircleScope,
  pickNeighborCircles,
  resetCircleCache,
} from "@/lib/circles";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { pinnedTitle } from "@/lib/pinned-circle";
import { listingsForSearch } from "@/lib/search-browse";
import { useApp } from "@/lib/store";
import { usePinnedCircle } from "@/lib/use-pinned-circle";
import type { Listing } from "@/lib/types";
import { ListingThumb, PlayBadge } from "./listing-media";
import { Photo } from "./ui";

/** Videos for the home strip. Server picks when the hourly job has written this city; otherwise the local likes ranking. */
export function useCircleList(): Listing[] {
  const { city, filters, allListings, comments, reactions, shops } = useApp();
  const scope = useMemo(
    () => circleScopeFrom(city, filters.city, filters.oblast),
    [city, filters.city, filters.oblast],
  );
  const scopeKey = `${scope.city}|${scope.oblast}`;
  const [tick, setTick] = useState(0);
  const [serverIds, setServerIds] = useState<string[] | null>(null);
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

  useEffect(() => {
    if (!scope.city || scope.city === "all") {
      setServerIds(null);
      return;
    }
    let cancel = false;
    void api<{ ids?: string[] }>(`/api/circles?city=${encodeURIComponent(scope.city)}`).then((res) => {
      if (cancel) return;
      const ids = res.ok && Array.isArray(res.data?.ids) ? res.data.ids.filter((id) => typeof id === "string") : [];
      setServerIds(ids.length ? ids : null);
    });
    return () => {
      cancel = true;
    };
  }, [scope.city, tick]);

  return useMemo(() => {
    const publicList = listingsForSearch(allListings, shops).filter((item) => listingInCircleScope(item, scope));
    if (serverIds?.length) {
      const fromServer = circlesFromIds(serverIds, publicList, scope);
      if (fromServer.length) return listingsForSearch(fromServer, shops);
    }
    const picked = pickNeighborCircles(publicList, scope, reactions, comments, Date.now(), false).listings;
    return listingsForSearch(picked, shops);
  }, [allListings, comments, reactions, scope, serverIds, shops]);
}

export function NeighborCircles({ listings }: { listings: Listing[] }) {
  void listings;
  const { t, lang } = useApp();
  const router = useRouter();
  const videos = useCircleList();
  const { pinned, ready: pinReady } = usePinnedCircle();
  const pinnedLabel = pinned ? pinnedTitle(pinned, lang) : "";
  const showEmpty = pinReady && !pinned && videos.length === 0;

  return (
    <div data-testid="neighbor-circles">
      {showEmpty ? (
        <p className="text-[12px] leading-[1.35] text-muted" data-testid="circles-empty">
          {t.homeCirclesEmpty}
        </p>
      ) : (
        <div className="sc flex gap-2.5 overflow-x-auto pb-0.5">
          {pinned ? (
            <button
              type="button"
              data-testid="pinned-circle"
              onClick={() => router.push(`/reels?id=${encodeURIComponent(pinned.id)}`)}
              className="flex w-[76px] shrink-0 flex-col items-center text-center"
            >
              <div className="relative w-[60px] rounded-full p-[2.5px]" style={{ background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" }}>
                <div className="relative aspect-square overflow-hidden rounded-full bg-chip">
                  {pinned.posterUrl ? (
                    <Photo src={pinned.posterUrl} alt={pinnedLabel} />
                  ) : (
                    <video src={pinned.videoUrl} muted playsInline loop autoPlay className="h-full w-full object-cover" />
                  )}
                  <PlayBadge compact />
                </div>
              </div>
              <div className="mt-1 w-full truncate text-[12px] font-bold leading-[1.2] text-ink">{pinnedLabel}</div>
            </button>
          ) : null}
          {videos.map((item) => {
            const title = listingTitle(item, lang);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/reels?id=${encodeURIComponent(item.id)}`)}
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
