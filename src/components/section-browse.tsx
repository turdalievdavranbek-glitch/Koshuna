"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CONSTRUCTION_CATEGORIES } from "@/lib/data";
import { realtyIsLiving } from "@/lib/realty";
import { formatStayDay, formatStayRange } from "@/lib/dates";
import { searchPlaceholder } from "@/lib/i18n";
import { isSectionId, patchForSection } from "@/lib/section";
import { BRANCH_ALL, parseBranch, resolveBranch, sectionFeedReset, sectionHref } from "@/lib/section-tree";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { IconBack, IconSearch, IconSliders } from "@/components/icons";
import { DealTypeChips } from "@/components/deal-chips";
import { LocationLine } from "@/components/location-line";
import { RealtyChips } from "@/components/realty-chips";
import { SellerKindChips } from "@/components/seller-chips";
import { VacancyChips } from "@/components/vacancy-chips";
import { StayCalendar } from "@/components/stay-calendar";
import { PhoneShell } from "@/components/shell";
import { Chip, useFiltered } from "@/components/ui";
import { LayoutSwitch, ListingGrid } from "@/components/listing-grid";

function FeedExtras({ id }: { id: SectionId }) {
  const { t, filters, setFilters } = useApp();
  const router = useRouter();

  if (id === "rent") {
    return (
      <div className="flex flex-col gap-3">
        <DealTypeChips labeled />
        <RealtyChips list />
        <SellerKindChips />
        {filters.realtyKind === "newbuild" || filters.stockType === "newbuild" || filters.realtyGroup === "apartments" ? (
          <button
            type="button"
            onClick={() => router.push("/complexes")}
            className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left"
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-accent-dark">{t.developerBadge}</span>
              <span className="mt-0.5 block text-[13px] font-semibold text-ink">{t.complexesTitle}</span>
            </span>
            <span className="text-[13px] font-semibold text-accent">›</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left"
        >
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-accent-dark">2ГИС</span>
            <span className="mt-0.5 block text-[13px] font-semibold text-ink">
              {filters.locLabel ?? t.pickOnMap}
            </span>
          </span>
          <span className="text-[13px] font-semibold text-accent">{t.mapMode}</span>
        </button>
        {filters.dealType === "short" && realtyIsLiving(filters.realtyGroup, filters.housingType) ? (
          <StayCalendar
            checkIn={filters.checkIn}
            checkOut={filters.checkOut}
            onChange={(next) => setFilters(next)}
          />
        ) : null}
      </div>
    );
  }

  if (id === "cars") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["sale", t.autoSale],
              ["rent", t.autoRent],
            ] as const
          ).map(([key, label]) => (
            <Chip
              key={key}
              active={filters.autoType === key}
              onClick={() =>
                setFilters({
                  autoType: key,
                  gear: key === "rent" ? filters.gear : "any",
                })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
        {filters.autoType === "rent" ? (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["any", t.any],
                ["auto", t.auto],
                ["manual", t.manual],
              ] as const
            ).map(([key, label]) => (
              <Chip key={key} active={filters.gear === key} onClick={() => setFilters({ gear: key })}>
                {label}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (id === "stays") {
    return (
      <StayCalendar
        checkIn={filters.checkIn}
        checkOut={filters.checkOut}
        onChange={(next) => setFilters(next)}
      />
    );
  }

  if (id === "vacancies") {
    return <VacancyChips list />;
  }

  if (id === "restaurants") {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left"
        >
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-accent-dark">2ГИС</span>
            <span className="mt-0.5 block text-[13px] font-semibold text-ink">
              {filters.locLabel ?? t.pickOnMap}
            </span>
          </span>
          <span className="text-[13px] font-semibold text-accent">{t.mapMode}</span>
        </button>
      </div>
    );
  }

  return null;
}

function ConstructionLink() {
  const { t } = useApp();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/section/construction")}
      className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left"
    >
      <span>
        <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-accent-dark">
          {t.sectionNames.construction}
        </span>
        <span className="mt-0.5 block text-[13px] font-semibold text-ink">
          {CONSTRUCTION_CATEGORIES.slice(0, 4)
            .map((c) => t.cats[c])
            .join(" · ")}
        </span>
      </span>
      <span className="text-[18px] leading-none text-muted-2">›</span>
    </button>
  );
}

function BranchList({
  title,
  rows,
  allLabel,
  onAll,
}: {
  title: string;
  rows: { id: string; label: string; onClick: () => void }[];
  allLabel?: string;
  onAll?: () => void;
}) {
  if (!rows.length && !onAll) return null;
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{title}</div>
      <div className="mt-3 overflow-hidden rounded-[18px] border border-line bg-white">
        {onAll && allLabel ? (
          <button
            type="button"
            onClick={onAll}
            className="flex h-[54px] w-full items-center justify-between border-b border-line px-4 text-left"
          >
            <span className="text-[15px] font-semibold text-ink">{allLabel}</span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        ) : null}
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className={`flex h-[54px] w-full items-center justify-between px-4 text-left ${
              i < rows.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span className="text-[15px] font-semibold text-ink">{row.label}</span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SectionBrowse({ id, path }: { id: SectionId; path: string[] }) {
  const router = useRouter();
  const { t, lang, filters, setFilters, setPendingPath, toggleFav } = useApp();
  const listings = useFiltered();
  const state = resolveBranch(id, path);
  const pathKey = path.join("/");

  useEffect(() => {
    if (!state) return;
    setFilters(state.patch);
    // URL is the source of the category branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pathKey]);

  if (!state) {
    return (
      <PhoneShell tab>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  const onFav = (listingId: string) => {
    const ok = toggleFav(listingId);
    if (!ok) {
      setPendingPath(sectionHref(id, path));
      router.push("/login");
    }
  };

  const goBack = () => {
    if (!path.length) {
      router.push("/");
      return;
    }
    router.push(sectionHref(id, state.parentPath));
  };

  const reset = () => {
    setFilters(sectionFeedReset(id));
    router.push(sectionHref(id));
  };

  const rows = state.options.map((row) => ({
    id: row.id,
    label: row.label(t),
    onClick: () => router.push(sectionHref(id, [...path, row.id])),
  }));

  if (state.isPicker) {
    return (
      <PhoneShell tab>
        <div className="flex min-h-0 flex-1 flex-col bg-screen">
          <div className="flex items-center justify-between px-5 pb-2 pt-1">
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            >
              <IconBack size={16} color="#17140F" />
            </button>
            <h1 className="max-w-[240px] truncate font-display text-[17px] font-bold text-ink">
              {state.title(t)}
            </h1>
            <span className="w-9" />
          </div>
          <LocationLine className="px-5 pb-2" />
          <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            {id === "rent" && path[0] === "apartments" ? (
              <button
                type="button"
                onClick={() => router.push("/complexes")}
                className="mb-3 flex w-full items-center justify-between rounded-[16px] border border-line bg-white px-4 py-3.5 text-left"
              >
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.developerBadge}</span>
                  <span className="mt-0.5 block text-[15px] font-semibold text-ink">{t.complexesTitle}</span>
                </span>
                <span className="text-muted-2">›</span>
              </button>
            ) : null}
            <BranchList
              title={state.eyebrow(t)}
              rows={rows}
              allLabel={t.sectionAllInCat}
              onAll={() => router.push(sectionHref(id, [...path, BRANCH_ALL]))}
            />
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <header className="shrink-0 bg-screen px-5 pb-3.5 pt-1.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            aria-label={t.feed}
          >
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="max-w-[240px] truncate font-display text-lg font-bold text-ink">{state.title(t)}</h1>
          <button type="button" onClick={() => router.push("/filters")} aria-label={t.filters}>
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
        <div className="mt-1">
          <LocationLine />
        </div>
        <div className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(id, t)}
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
        </div>
      </header>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="mt-3.5 flex flex-col gap-3">
          {state.showFeed ? <FeedExtras id={id} /> : null}
          {rows.length ? <BranchList title={state.eyebrow(t)} rows={rows} /> : null}
          {id === "secondhand" && !path.length ? <ConstructionLink /> : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.fresh}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-muted">{t.nListings(listings.length)}</span>
            <LayoutSwitch />
          </div>
        </div>
        <div className="sc mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          {id === "rent" ? <SellerKindChips /> : (
            <Chip
              active={filters.neighborOnly}
              onClick={() => setFilters({ neighborOnly: !filters.neighborOnly })}
            >
              {t.fromNeighbor}
            </Chip>
          )}
          <Chip
            active={filters.priceDroppedOnly}
            onClick={() => setFilters({ priceDroppedOnly: !filters.priceDroppedOnly })}
          >
            {t.priceDropped}
          </Chip>
          <Chip active={filters.videoOnly} onClick={() => setFilters({ videoOnly: !filters.videoOnly })}>
            {t.videoOnly}
          </Chip>
          <Chip onClick={() => router.push("/filters")}>
            {filters.sort === "new" ? t.newest : filters.sort === "price-asc" ? t.priceAsc : t.priceDesc}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          {id === "stays" && filters.checkIn ? (
            <Chip onClick={() => router.push("/filters")}>
              {filters.checkOut
                ? formatStayRange(filters.checkIn, filters.checkOut, lang)
                : formatStayDay(filters.checkIn, lang)}
            </Chip>
          ) : null}
          <button type="button" onClick={reset} className="shrink-0 px-[13px] py-[7px] text-[13px] font-semibold text-accent">
            {t.resetFilters}
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-line bg-surface p-6 text-center">
            <div className="text-[15px] font-semibold text-ink">{t.empty}</div>
            <p className="mt-2 text-[13px] text-muted">{t.emptyHint}</p>
            <button type="button" onClick={reset} className="mt-4 text-[13px] font-semibold text-accent">
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <ListingGrid listings={listings} onFav={onFav} />
        )}
      </div>
    </PhoneShell>
  );
}

export function SectionRoutePage() {
  const { id, branch } = useParams<{ id: string; branch?: string | string[] }>();
  const router = useRouter();
  const { t, filters, setFilters } = useApp();

  useEffect(() => {
    if (id !== "car-rental") return;
    setFilters({ ...patchForSection("cars", filters), autoType: "rent" });
    router.replace("/section/cars");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (id === "car-rental") {
    return (
      <PhoneShell tab>
        <div className="p-6" />
      </PhoneShell>
    );
  }

  if (!isSectionId(id)) {
    return (
      <PhoneShell tab>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  return <SectionBrowse id={id} path={parseBranch(branch)} />;
}
