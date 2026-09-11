"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOME_HERO_COUNT, PROMOTED_IDS, formatSom, homeTiles } from "@/lib/data";
import { applyFilters, homeFeedFilters } from "@/lib/filter";
import { listingTitle, searchPlaceholder } from "@/lib/i18n";
import { patchForSection } from "@/lib/section";
import { locationLineLabel } from "@/lib/places";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { PhoneShell } from "@/components/shell";
import { Chip } from "@/components/ui";
import { LayoutSwitch, ListingGrid, RecentlyViewed } from "@/components/listing-grid";
import { ListingThumb, isVideoListing } from "@/components/listing-media";
import { ListingSocialMeta } from "@/components/listing-social";
import { NeighborBanner } from "@/components/neighbor-seal";
import { NeighborCircles } from "@/components/neighbor-circles";
import { KonshuBridges } from "@/components/konshu-bridges";
import { Flag, IconBell, IconPin, IconSearch, IconSliders } from "@/components/icons";
import { BrandMark } from "@/components/brand";
import { openLocationPicker } from "@/components/location-line";

export default function FeedPage() {
  const { t, lang, city, filters, setFilters, resetFilters, user, setPendingPath, toggleFav, allListings } =
    useApp();
  const router = useRouter();
  const listings = applyFilters(allListings, homeFeedFilters(filters), city);
  const promoted = PROMOTED_IDS.map((id) => allListings.find((item) => item.id === id)).filter(Boolean);
  const tiles = homeTiles();
  const hero = tiles.slice(0, HOME_HERO_COUNT);
  const rest = tiles.slice(HOME_HERO_COUNT);

  const onFav = (id: string) => {
    const ok = toggleFav(id);
    if (!ok) {
      setPendingPath("/");
      router.push("/login");
    }
  };

  const openSearch = () => {
    setFilters({ section: null, category: null });
    router.push("/filters");
  };

  const openSection = (id: SectionId, href: string) => {
    if (id !== "shops") setFilters(patchForSection(id, filters));
    router.push(href);
  };

  const quick = [
    { id: "shops" as const, label: t.homeQuickBazaar, href: "/shops" },
    { id: "restaurants" as const, label: t.homeQuickFood, href: "/section/restaurants" },
    { id: "rent" as const, label: t.homeQuickRent, href: "/section/rent" },
    { id: "cars" as const, label: t.homeQuickCars, href: "/section/cars" },
    { id: "vacancies" as const, label: t.homeQuickJobs, href: "/section/vacancies" },
  ];

  return (
    <PhoneShell tab>
      <header className="shrink-0 bg-screen px-5 pb-3.5 pt-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={26} wordClass="text-[23px] text-ink" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openLocationPicker(router, "/")}
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-[7px] text-[13px] font-semibold text-ink"
            >
              <IconPin size={13} color="#B8452F" />
              <span className="max-w-[140px] truncate">
                {locationLineLabel(lang, city, filters, t.cities, t.oblasts, t.locationRefine, t.locationCountryHint)}
              </span>
              <span className="text-[10px] text-muted-2">▾</span>
            </button>
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            >
              <IconBell size={16} color="#17140F" />
              <span className="absolute top-1.5 right-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-accent" />
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={openSearch}
          className="mt-3 flex h-12 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 text-left"
        >
          <IconSearch size={17} color="#A79C8C" />
          <span className="h-full flex-1 truncate text-[15px] leading-[48px] text-muted-2">
            {filters.query || searchPlaceholder(null, t)}
          </span>
          <span aria-label={t.filters}>
            <IconSliders size={17} color="#17140F" />
          </span>
        </button>
        <div className="sc mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {quick.map((item) => (
            <Chip key={item.id} onClick={() => openSection(item.id, item.href)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </header>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="mt-1">
          <NeighborBanner
            active={filters.neighborOnly}
            onClick={() => setFilters({ neighborOnly: !filters.neighborOnly })}
          />
        </div>

        <NeighborCircles listings={listings} />

        <div className="mt-[18px] flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.sections}</h2>
          <span className="text-[13px] font-semibold text-muted">{t.nSections}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {hero.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSection(s.id, s.href)}
              className="section-tile flex h-[148px] flex-col overflow-hidden rounded-[18px] text-center"
            >
              <span className="relative z-[1] line-clamp-2 shrink-0 bg-[#fffdf8] px-2 py-2 text-[13px] font-semibold leading-[1.2] text-ink">
                {s.id === "shops" ? t.shopNav : t.sectionNames[s.id]}
              </span>
              <span className="min-h-0 flex-1 overflow-hidden bg-[#eee8dc]">
                <img src={s.art} alt="" className="h-full w-full object-cover" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {rest.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSection(s.id, s.href)}
              className="section-tile flex h-[102px] flex-col overflow-hidden rounded-[14px] text-center"
            >
              <span className="relative z-[1] line-clamp-2 shrink-0 bg-[#fffdf8] px-1 py-1.5 text-[11px] font-semibold leading-[1.15] text-ink">
                {t.sectionNames[s.id]}
              </span>
              <span className="min-h-0 flex-1 overflow-hidden bg-[#eee8dc]">
                <img src={s.art} alt="" className="h-full w-full object-cover" />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-[22px]">
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
              onClick={() => (user ? router.push("/post") : router.push("/login"))}
              className="flex w-[100px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-[#D3C7B4] px-2.5 text-center text-xs font-semibold leading-[1.35] text-accent-dark"
            >
              {t.promoteYours}
            </button>
          </div>
        </div>

        <RecentlyViewed />

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.fresh}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-muted">{t.nListings(listings.length)}</span>
            <LayoutSwitch />
          </div>
        </div>
        <div className="sc mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          <Chip
            active={filters.neighborOnly}
            onClick={() => setFilters({ neighborOnly: !filters.neighborOnly })}
          >
            {t.fromNeighbor}
          </Chip>
          <Chip
            active={filters.priceDroppedOnly}
            onClick={() => setFilters({ priceDroppedOnly: !filters.priceDroppedOnly })}
          >
            {t.priceDropped}
          </Chip>
          <Chip active={filters.videoOnly} onClick={() => setFilters({ videoOnly: !filters.videoOnly })}>
            {t.videoOnly}
          </Chip>
          <Chip onClick={openSearch}>
            {t.allCategories}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          <Chip onClick={openSearch}>
            {filters.sort === "new" ? t.newest : filters.sort === "price-asc" ? t.priceAsc : t.priceDesc}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          <button type="button" onClick={resetFilters} className="shrink-0 px-[13px] py-[7px] text-[13px] font-semibold text-accent">
            {t.resetFilters}
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-line bg-surface p-6 text-center">
            <div className="text-[15px] font-semibold text-ink">{t.empty}</div>
            <p className="mt-2 text-[13px] text-muted">{t.emptyHint}</p>
            <button type="button" onClick={resetFilters} className="mt-4 text-[13px] font-semibold text-accent">
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <ListingGrid listings={listings} onFav={onFav} />
        )}

        <div className="mt-6">
          <KonshuBridges />
        </div>

        <p className="mt-4 text-xs leading-[1.5] text-muted-2">{t.disclaimer}</p>
        <div className="mt-3.5 flex flex-col gap-1.5 pb-1.5">
          <span className="font-display text-base font-bold text-ink">{t.footerSlogan}</span>
          <span className="flex items-center gap-[7px] text-xs text-muted">
            <Flag />
            {t.country} · KGS
          </span>
        </div>
      </div>
    </PhoneShell>
  );
}
