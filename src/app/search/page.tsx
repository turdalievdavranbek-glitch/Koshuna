"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyFilters, listingCreatedMs } from "@/lib/filter";
import { searchPlaceholder } from "@/lib/i18n";
import {
  listingsForSearch,
  patchForSearchTile,
  patchForSearchUp,
  pointsForSearch,
  rootSearchTiles,
  searchLevel,
  type SearchTile,
} from "@/lib/search-browse";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ScopeChips } from "@/components/scope-chips";
import { BrowseColumns } from "@/components/browse-columns";
import { PhoneShell } from "@/components/shell";
import { ListingGrid } from "@/components/listing-grid";
import { IconSearch, IconSliders } from "@/components/icons";

function PhotoTile({ tile, testId, onClick }: { tile: SearchTile; testId: string; onClick: () => void }) {
  const { t } = useApp();
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="section-tile flex h-[112px] flex-col overflow-hidden rounded-[16px] text-center"
    >
      <span className="relative z-[1] line-clamp-2 shrink-0 bg-[#fffdf8] px-2 py-1.5 text-[12px] font-semibold leading-[1.2] text-ink">
        {tile.label(t)}
      </span>
      <span className="min-h-0 flex-1 overflow-hidden bg-[#eee8dc]">
        <img src={tile.art} alt="" className="h-full w-full object-cover" />
      </span>
    </button>
  );
}

function PointList({ shops }: { shops: Shop[] }) {
  const { t } = useApp();
  const router = useRouter();
  return (
    <div className="mt-2 flex flex-col gap-2" data-testid="search-points">
      {shops.map((shop) => (
        <button
          key={shop.id}
          type="button"
          data-testid={`search-point-${shop.id}`}
          onClick={() => router.push(`/shops/${shop.id}`)}
          className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-white px-3 py-2.5 text-left"
        >
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-[#eee8dc]">
            {shop.coverUrl ? <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">{shop.name}</span>
            <span className="block truncate text-[12px] text-muted">{t.shopCats[shop.category]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const { t, filters, setFilters, allListings, shops, city } = useApp();
  const router = useRouter();
  const [debounced, setDebounced] = useState(() => filters.query.trim());

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(filters.query.trim()), 150);
    return () => window.clearTimeout(id);
  }, [filters.query]);

  const source = useMemo(() => listingsForSearch(allListings, shops), [allListings, shops]);
  const level = searchLevel(filters);
  const querying = debounced.length > 0;

  const points = useMemo(
    () => (querying || level?.section === "shops" ? pointsForSearch(shops, filters, city, querying ? debounced : "") : []),
    [querying, level?.section, shops, filters, city, debounced],
  );
  const goods = useMemo(() => {
    const matched = querying
      ? applyFilters(source, { ...filters, section: null, query: debounced }, city)
      : level
        ? applyFilters(source, { ...filters, query: "" }, city)
        : [];
    if (filters.sort !== "new") return matched;
    return [...matched].sort((a, b) => (listingCreatedMs(b) ?? 0) - (listingCreatedMs(a) ?? 0));
  }, [querying, source, filters, debounced, city, level]);

  const openTile = (tile: SearchTile) => {
    if (tile.href) {
      router.push(tile.href);
      return;
    }
    setFilters(patchForSearchTile(tile, filters));
  };

  return (
    <PhoneShell tab>
      <BrowseColumns>
      <div className="shrink-0 px-5 pt-2">
        <div className="flex h-11 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            type="search"
            autoFocus
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(level?.section ?? null, t)}
            data-testid="search-query"
            aria-label={t.tabSearch}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
          <button
            type="button"
            onClick={() => router.push("/filters")}
            aria-label={t.filters}
            data-testid="search-filters"
            className="flex h-9 w-9 shrink-0 items-center justify-center desk:hidden"
          >
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
        <div className="mt-2">
          <ScopeChips />
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {querying ? (
          points.length === 0 && goods.length === 0 ? (
            <EmptyState variant="nothing" onReset={() => setFilters({ query: "" })} />
          ) : (
            <>
              <h2 className="font-display text-[19px] font-bold text-ink">{t.searchPoints}</h2>
              {points.length ? <PointList shops={points} /> : <p className="mt-2 text-[14px] text-muted">{t.empty}</p>}
              <h2 className="mt-5 font-display text-[19px] font-bold text-ink">{t.searchGoods}</h2>
              {goods.length ? (
                <div className="mt-3" data-testid="search-goods">
                  <ListingGrid listings={goods} columns="browse" />
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-muted">{t.empty}</p>
              )}
            </>
          )
        ) : level ? (
          <div data-testid="search-drill">
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                data-testid="search-up"
                onClick={() => setFilters(patchForSearchUp(level.section, level.path, filters))}
                aria-label={t.backLeave}
                className="flex w-10 shrink-0 items-center justify-center rounded-[16px] border border-line bg-surface text-[20px] text-ink"
              >
                ‹
              </button>
              <div className="section-tile flex h-[72px] min-w-0 flex-1 overflow-hidden rounded-[16px]" data-testid="search-pinned">
                <span className="w-24 shrink-0 overflow-hidden bg-[#eee8dc]">
                  <img src={level.art} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 items-center px-3 text-left text-[15px] font-semibold leading-snug text-ink">
                  {level.title(t)}
                </span>
              </div>
            </div>
            {level.tiles.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2.5 desk:grid-cols-3">
                {level.tiles.map((tile) => (
                  <PhotoTile key={tile.id} tile={tile} testId={`search-tile-${tile.id}`} onClick={() => openTile(tile)} />
                ))}
              </div>
            ) : null}
            {level.section === "shops" && points.length ? (
              <div className="mt-5">
                <h2 className="font-display text-[19px] font-bold text-ink">{t.searchPoints}</h2>
                <PointList shops={points} />
              </div>
            ) : null}
            <h2 className="mt-5 font-display text-[19px] font-bold text-ink">{t.searchListings}</h2>
            {goods.length ? (
              <div className="mt-3" data-testid="search-results">
                <ListingGrid listings={goods} columns="browse" />
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-muted">{t.empty}</p>
            )}
          </div>
        ) : (
          <>
            <h2 className="font-display text-[19px] font-bold text-ink">{t.searchSections}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 desk:grid-cols-3">
              {rootSearchTiles().map((tile) => (
                <PhotoTile key={tile.id} tile={tile} testId={`search-section-${tile.id}`} onClick={() => openTile(tile)} />
              ))}
            </div>
          </>
        )}
      </div>
      </BrowseColumns>
    </PhoneShell>
  );
}
