"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { isSectionVisible } from "@/lib/features";
import { applyFilters, clearFreshListPatch, homeFeedFilters } from "@/lib/filter";
import { listingTitle, searchPlaceholder } from "@/lib/i18n";
import { listingsForSearch } from "@/lib/search-browse";
import { patchForSection } from "@/lib/section";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { NearEmptyState, ScopeChips } from "@/components/scope-chips";
import { openLocationPicker, shownLocationLabel } from "@/components/location-line";
import { PhoneShell } from "@/components/shell";
import { Chip, LangSwitch } from "@/components/ui";
import { LayoutSwitch, ListingGrid, RecentlyViewed } from "@/components/listing-grid";
import { ListingThumb, isVideoListing } from "@/components/listing-media";
import { ListingSocialMeta } from "@/components/listing-social";
import { NeighborCircles } from "@/components/neighbor-circles";
import { NeighborNearby, TodayOnPoints } from "@/components/magnets";
import { HomeFreshFilters } from "@/components/home-fresh-filters";
import { RingOnRise, UnreadBadge } from "@/components/unread-badge";
import { Flag, IconBell, IconChevronDown, IconPin, IconSearch, IconSliders } from "@/components/icons";
import { BrandMark } from "@/components/brand";
import { useNotices } from "@/lib/notices";

export default function FeedPage() {
  const { t, lang, city, filters, setFilters, user, setPendingPath, toggleFav, allListings, shops, online, synced, resync } = useApp();
  const { unread } = useNotices(user?.id ?? null);
  const router = useRouter();
  const listings = listingsForSearch(applyFilters(allListings, homeFeedFilters(filters), city), shops);
  const promoted = listingsForSearch(allListings, shops).filter((item) => item.status === "promoted");

  const onFav = (id: string) => {
    const ok = toggleFav(id);
    if (!ok) {
      setPendingPath("/");
      router.push("/login");
    }
  };

  const openFilters = () => {
    router.push("/filters");
  };

  const openSection = (id: SectionId, href: string) => {
    if (id !== "shops") setFilters(patchForSection(id, filters));
    router.push(href);
  };

  const feedQuick = [
    { id: "shops" as const, label: t.homeQuickBazaar, href: "/shops" },
    { id: "restaurants" as const, label: t.homeQuickFood, href: "/section/restaurants" },
    { id: "services" as const, label: t.sectionNames.services, href: "/section/services" },
    { id: "rent" as const, label: t.homeQuickRent, href: "/section/rent" },
    { id: "cars" as const, label: t.homeQuickCars, href: "/section/cars" },
    { id: "vacancies" as const, label: t.homeQuickJobs, href: "/section/vacancies" },
  ];

  return (
    <PhoneShell tab>
      <header
        className="z-20 shrink-0 overflow-visible border-b border-line/70 bg-screen px-5 pb-2"
        style={{ paddingTop: "max(6px, env(safe-area-inset-top, 0px))" }}
        data-testid="home-sticky"
      >
        <div className="flex items-center gap-1.5 desk:hidden">
          <BrandMark
            size={26}
            className="shrink-0"
            wordClass="text-[20px] text-ink min-[380px]:text-[23px]"
          />
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <div data-testid="home-lang" className="shrink-0">
              <LangSwitch size="sm" />
            </div>
            <Link
              href="/notifications"
              data-testid="home-bell"
              aria-label={t.notifications}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
            >
              <RingOnRise count={unread}>
                <IconBell size={16} color="#17140F" />
              </RingOnRise>
              <UnreadBadge small count={unread} testId="notif-dot" className="-top-0.5 -right-0.5" />
            </Link>
          </div>
        </div>
        <button
          type="button"
          data-testid="home-location"
          onClick={() => openLocationPicker(router, "/")}
          className="mt-2 flex w-full items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-[7px] text-left text-[13px] font-semibold text-ink"
        >
          <IconPin size={13} color="#B8452F" />
          <span data-testid="home-location-label" className="min-w-0 flex-1">
            {shownLocationLabel(lang, city, filters, t)}
          </span>
          <span className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chip" aria-hidden>
            <IconChevronDown size={14} color="#17140F" />
          </span>
        </button>
        <div className="mt-2">
          <ScopeChips />
        </div>
        {filters.scope === "near" ? (
          <Link href="/map" data-testid="home-map-link" className="mt-2 inline-flex text-[13px] font-semibold text-accent">
            {t.map} ›
          </Link>
        ) : null}
        <div className="mt-2">
          <NeighborCircles listings={listings} />
        </div>
        <div
          className="mt-2 flex h-11 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 desk:hidden"
          data-testid="home-search"
        >
          <IconSearch size={17} color="#A79C8C" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(filters.section, t)}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
            aria-label={t.filters}
          />
          <button
            type="button"
            onClick={openFilters}
            aria-label={t.filters}
            data-testid="home-filters"
            className="flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
      </header>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4" data-testid="home-feed-scroll">
        <NeighborNearby />
        <TodayOnPoints />
        <div className="sc mt-3 flex gap-2 overflow-x-auto pb-0.5" data-testid="home-feed-quick">
          {feedQuick.filter((item) => isSectionVisible(item.id)).map((item) => (
            <Chip key={item.id} size="sm" onClick={() => openSection(item.id, item.href)}>
              {item.label}
            </Chip>
          ))}
        </div>

        {promoted.length > 0 ? <div className="mt-[22px]">
          <div className="flex items-center gap-[7px]">
            <span className="font-display text-[17px] font-bold text-ink">{t.promoted}</span>
            <span className="rounded-md bg-accent-tint px-[7px] py-0.5 text-[10px] font-bold tracking-wide text-accent-dark">
              {t.ad.toUpperCase()}
            </span>
          </div>
          <div className="sc mt-2.5 flex gap-2.5 overflow-x-auto pb-0.5">
            {promoted.map((item) =>
              item ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/listing/${item.id}`)}
                  className={`w-[148px] shrink-0 text-left ${
                    isVideoListing(item) ? "" : "overflow-hidden rounded-2xl border border-line bg-surface"
                  }`}
                >
                  <ListingThumb
                    listing={item}
                    alt={listingTitle(item, lang)}
                    compact
                    className={isVideoListing(item) ? "px-4 pt-2" : ""}
                  />
                  <div className={`px-[11px] pb-[11px] pt-[9px] ${isVideoListing(item) ? "text-center" : ""}`}>
                    <div className="font-display text-[15px] font-bold text-ink">
                      {formatSom(item.price)}{" "}
                      <span className="text-[11px] text-muted">
                        KGS{item.unit === "month" ? t.perMonthShort.replace("/ ", "/") : ""}
                      </span>
                    </div>
                    <div className="mt-[3px] text-xs leading-[1.3] text-muted">
                      {item.rooms ? `${item.rooms} ${t.roomWord}` : listingTitle(item, lang).split(" ")[0]} ·{" "}
                      {t.cities[item.city]}
                    </div>
                    <ListingSocialMeta listingId={item.id} size="sm" align={isVideoListing(item) ? "center" : "start"} />
                  </div>
                </button>
              ) : null,
            )}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  router.push("/post");
                  return;
                }
                setPendingPath("/post");
                router.push("/login");
              }}
              className="flex w-[100px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-[#D3C7B4] px-2.5 text-center text-xs font-semibold leading-[1.35] text-accent-dark"
            >
              {t.promoteYours}
            </button>
          </div>
        </div> : null}

        <RecentlyViewed />

        <div className="mt-5 flex items-center justify-between gap-2">
          <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-ink">{t.fresh}</h2>
          <LayoutSwitch />
        </div>
        <HomeFreshFilters />

        {listings.length === 0 ? (
          !synced ? null : filters.scope === "near" ? (
            <NearEmptyState />
          ) : !online && allListings.length === 0 ? (
            <EmptyState variant="offline" onRetry={() => resync()} />
          ) : allListings.length === 0 ? (
            <EmptyState variant="first" />
          ) : filters.section || filters.category ? (
            <div className="mt-4 rounded-[16px] border border-line bg-white px-4 py-6 text-center" data-testid="fresh-section-empty">
              <p className="text-[14px] font-semibold text-ink">{t.freshSectionEmpty}</p>
              <button
                type="button"
                data-testid="fresh-show-all"
                onClick={() => setFilters(clearFreshListPatch(filters))}
                className="mt-3 h-11 rounded-2xl bg-accent px-5 text-[14px] font-semibold text-accent-on"
              >
                {t.freshShowAll}
              </button>
            </div>
          ) : (
            <EmptyState variant="nothing" onReset={() => setFilters(clearFreshListPatch(filters))} />
          )
        ) : (
          <ListingGrid listings={listings} onFav={onFav} />
        )}

        <p className="mt-4 text-xs leading-[1.5] text-muted-2">{t.disclaimer}</p>
        <div className="mt-3.5 flex items-center gap-[7px] pb-1.5 text-xs text-muted">
          <Flag />
          {t.country} · KGS
        </div>
      </div>
    </PhoneShell>
  );
}
