"use client";

import { useRouter } from "next/navigation";
import { homeTiles } from "@/lib/data";
import { isSectionVisible } from "@/lib/features";
import { applyFilters, homeFeedFilters } from "@/lib/filter";
import { searchPlaceholder } from "@/lib/i18n";
import { patchForSection } from "@/lib/section";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ScopeChips } from "@/components/scope-chips";
import { PhoneShell } from "@/components/shell";
import { ListingGrid } from "@/components/listing-grid";
import { IconSearch, IconSliders } from "@/components/icons";

export default function SearchPage() {
  const { t, filters, setFilters, allListings, city } = useApp();
  const router = useRouter();
  const query = filters.query.trim();
  const tiles = homeTiles().filter((tile) => isSectionVisible(tile.id));
  const results = applyFilters(allListings, { ...homeFeedFilters(filters), section: null }, city);

  const openSection = (id: SectionId, href: string) => {
    if (id !== "shops") setFilters(patchForSection(id, filters));
    router.push(href);
  };

  return (
    <PhoneShell tab>
      <div className="shrink-0 px-5 pt-2">
        <div className="flex h-11 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            type="search"
            autoFocus
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(null, t)}
            data-testid="search-query"
            aria-label={t.tabSearch}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
          <button
            type="button"
            onClick={() => router.push("/filters")}
            aria-label={t.filters}
            data-testid="search-filters"
            className="flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
        <div className="mt-2">
          <ScopeChips />
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {query ? (
          results.length === 0 ? (
            <EmptyState variant="nothing" onReset={() => setFilters({ query: "" })} />
          ) : (
            <ListingGrid listings={results} />
          )
        ) : (
          <>
            <h2 className="font-display text-[19px] font-bold text-ink">{t.searchSections}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {tiles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`search-section-${s.id}`}
                  onClick={() => openSection(s.id, s.href)}
                  className="section-tile flex h-[112px] flex-col overflow-hidden rounded-[16px] text-center"
                >
                  <span className="relative z-[1] line-clamp-2 shrink-0 bg-[#fffdf8] px-2 py-1.5 text-[12px] font-semibold leading-[1.2] text-ink">
                    {s.id === "shops" ? t.shopNav : t.sectionNames[s.id]}
                  </span>
                  <span className="min-h-0 flex-1 overflow-hidden bg-[#eee8dc]">
                    <img src={s.art} alt="" className="h-full w-full object-cover" />
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
