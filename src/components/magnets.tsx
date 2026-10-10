"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listingHasPrice } from "@/lib/deal";
import type { Dict } from "@/lib/i18n";
import { listingTitle } from "@/lib/i18n";
import {
  MAGNET_BLOCK_MIN,
  MAGNET_STRIP_MAX,
  formatKmLabel,
  neighborListings,
  pointListingsToday,
  pointsWithListingsToday,
  priceBand,
  priceStatsCategory,
  priceStatsUnit,
  publicInRegion,
  type PriceBand,
} from "@/lib/magnets";
import { useMagnetSettings } from "@/lib/use-magnet-settings";
import { useApp } from "@/lib/store";
import type { Listing, SectionId } from "@/lib/types";
import { ListingThumb } from "./listing-media";
import { Photo } from "./ui";

type PriceStats = { n: number; p25: number; median: number; p75: number };

function readPriceStats(body: unknown): PriceStats | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.n !== "number" || typeof row.p25 !== "number" || typeof row.median !== "number" || typeof row.p75 !== "number") {
    return null;
  }
  if (!Number.isFinite(row.n) || !Number.isFinite(row.p25) || !Number.isFinite(row.median) || !Number.isFinite(row.p75)) return null;
  return { n: row.n, p25: row.p25, median: row.median, p75: row.p75 };
}

function categoryLabel(category: string, section: SectionId, t: Dict): string {
  if (t.cats[category]) return t.cats[category];
  if (t.shopKinds[category]) return t.shopKinds[category];
  if (t.shopCats[category]) return t.shopCats[category];
  const sections = t.sectionNames as Record<string, string>;
  if (sections[category]) return sections[category];
  return t.sectionNames[section];
}

function verdict(band: PriceBand, t: Dict): string {
  if (band === "below") return t.magnetPriceBelow;
  if (band === "above") return t.magnetPriceAbove;
  return t.magnetPriceUsual;
}

/** «Цена честная?» under the price. Nothing when magnets are off, the price is «договорная», or n is too small. */
export function PriceHonest({ listing }: { listing: Listing }) {
  const { t } = useApp();
  const settings = useMagnetSettings();
  const [stats, setStats] = useState<PriceStats | null>(null);
  const category = priceStatsCategory(listing);
  const unit = priceStatsUnit(listing);
  const city = listing.city;
  const price = listing.price;
  const enabled = settings?.enabled === true;
  const minN = settings?.priceMinN ?? 0;

  useEffect(() => {
    if (!enabled || !category || !city || !(price > 0)) {
      setStats(null);
      return;
    }
    let dead = false;
    const ac = new AbortController();
    const params = new URLSearchParams({ category, city, unit });
    fetch(`/api/price-stats?${params}`, { signal: ac.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (dead) return;
        const parsed = readPriceStats(body);
        setStats(parsed && parsed.n >= minN ? parsed : null);
      })
      .catch(() => {
        if (!dead) setStats(null);
      });
    return () => {
      dead = true;
      ac.abort();
    };
  }, [enabled, minN, category, city, unit, price]);

  if (!enabled || !stats || !listingHasPrice(listing) || stats.n < minN) return null;
  const band = priceBand(listing.price, stats.p25, stats.p75);
  const place = t.cities[city] || city;
  return (
    <div data-slot="magnets" className="mt-2">
      <p className="text-[14px] leading-snug text-ink">
        <span className="font-semibold">{verdict(band, t)}</span> {t.magnetPriceIn(categoryLabel(category, listing.section, t), place)}
      </p>
      <p className="text-[11px] text-muted">{t.magnetByListings(stats.n)}</p>
    </div>
  );
}

/** This point's public listings created today (Asia/Bishkek). Nothing when there are none. */
export function TodayOnPoint({ shopId }: { shopId: string }) {
  const { t, lang, allListings, shops } = useApp();
  const settings = useMagnetSettings();
  const items = useMemo(() => pointListingsToday(allListings, shops, shopId).slice(0, MAGNET_STRIP_MAX), [allListings, shops, shopId]);
  if (!settings?.enabled || items.length === 0) return null;
  return (
    <div data-slot="today-on-point" className="mt-4">
      <div className="font-display text-[15px] font-bold text-ink">{t.magnetTodayPoint}</div>
      <div className="sc mt-2 flex gap-2.5 overflow-x-auto pb-0.5">
        {items.map((item) => (
          <Link key={item.id} href={`/listing/${item.id}`} className="w-[88px] shrink-0">
            <ListingThumb listing={item} alt={listingTitle(item, lang)} compact />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Home. Uses the phone fix already stored by «Рядом». Never asks for location. */
export function NeighborNearby() {
  const { t, lang, city, filters, allListings, shops } = useApp();
  const settings = useMagnetSettings();
  const lat = filters.nearLat;
  const lng = filters.nearLng;
  const regionCount = useMemo(() => publicInRegion(allListings, shops, filters, city).length, [allListings, shops, filters, city]);
  const nearby = useMemo(() => {
    if (lat == null || lng == null) return [];
    return neighborListings(allListings, shops, lat, lng);
  }, [allListings, shops, lat, lng]);
  if (!settings?.enabled || regionCount < settings.minListings) return null;
  if (lat == null || lng == null || nearby.length < MAGNET_BLOCK_MIN) return null;
  return (
    <section data-slot="neighbor-nearby" className="mt-4">
      <h2 className="font-display text-[17px] font-bold text-ink">{t.magnetNeighbor}</h2>
      <div className="sc mt-2.5 flex gap-2.5 overflow-x-auto pb-0.5">
        {nearby.slice(0, MAGNET_STRIP_MAX).map(({ listing, km }) => (
          <Link key={listing.id} href={`/listing/${listing.id}`} className="w-[92px] shrink-0 text-center">
            <ListingThumb listing={listing} alt={listingTitle(listing, lang)} compact />
            <span className="mt-1 block truncate text-[12px] font-semibold text-ink">{listingTitle(listing, lang)}</span>
            <span className="block text-[12px] text-muted">{formatKmLabel(km)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Home. Points in the selected region with a public listing created today. */
export function TodayOnPoints() {
  const { t, city, filters, allListings, shops } = useApp();
  const settings = useMagnetSettings();
  const regionCount = useMemo(() => publicInRegion(allListings, shops, filters, city).length, [allListings, shops, filters, city]);
  const points = useMemo(
    () => pointsWithListingsToday(allListings, shops, filters, city),
    [allListings, shops, filters, city],
  );
  if (!settings?.enabled || regionCount < settings.minListings || points.length < MAGNET_BLOCK_MIN) return null;
  return (
    <section data-slot="today-on-points" className="mt-[22px]">
      <h2 className="font-display text-[17px] font-bold text-ink">{t.magnetTodayPoints}</h2>
      <div className="sc mt-2.5 flex gap-2.5 overflow-x-auto pb-0.5">
        {points.slice(0, MAGNET_STRIP_MAX).map(({ shop, count }) => (
          <Link
            key={shop.id}
            href={`/shops/${shop.id}`}
            className="flex w-[168px] shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface p-2"
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-chip">
              {shop.coverUrl ? <Photo src={shop.coverUrl} alt="" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-ink">{shop.name}</span>
              <span className="block text-[12px] text-muted">{t.magnetTodayMore(count)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
