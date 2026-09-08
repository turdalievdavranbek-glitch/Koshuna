"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES, PROMOTED_IDS, SECTIONS, SERVICE_CATEGORIES, formatSom, listingById } from "@/lib/data";
import { listingTitle, searchPlaceholder } from "@/lib/i18n";
import { formatStayDay, formatStayRange } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { StayCalendar } from "@/components/stay-calendar";
import { Chip, ListingHero, ListingRow, Photo, useFiltered } from "@/components/ui";
import { Flag, IconBell, IconPin, IconSearch, IconSliders, sectionIcon } from "@/components/icons";

export default function FeedPage() {
  const { t, lang, city, setCity, filters, setFilters, resetFilters, user, setPendingPath, toggleFav } = useApp();
  const router = useRouter();
  const listings = useFiltered();
  const [cityOpen, setCityOpen] = useState(false);
  const featured = listings[0];
  const rest = listings.slice(1);
  const promoted = PROMOTED_IDS.map((id) => listingById(id)).filter((item) => {
    if (!item) return false;
    if (filters.section && item.section !== filters.section) return false;
    return true;
  });

  const onFav = (id: string) => {
    const ok = toggleFav(id);
    if (!ok) {
      setPendingPath("/");
      router.push("/login");
    }
  };

  return (
    <PhoneShell tab>
      <header className="shrink-0 bg-screen px-5 pb-3.5 pt-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-[23px] font-extrabold tracking-[-0.01em] text-ink">
              konshu<span className="text-accent">●</span>
            </span>
            <Flag />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCityOpen(true)}
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-[7px] text-[13px] font-semibold text-ink"
            >
              <IconPin size={13} color="#B8452F" />
              {city === "all" ? t.country : t.cities[city]}
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
        <div className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(filters.section, t)}
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
          <button type="button" onClick={() => router.push("/filters")} aria-label={t.filters}>
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
      </header>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.sections}</h2>
          <span className="text-[13px] font-semibold text-muted">{t.nSections}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const next = filters.section === s.id ? null : s.id;
                setFilters({
                  section: next,
                  category: null,
                  rooms: next === "rent" ? filters.rooms : [],
                  housingType: next === "rent" ? filters.housingType : "any",
                  bodyType: next === "cars" || next === "car-rental" ? filters.bodyType : "any",
                  gear: next === "car-rental" ? filters.gear : "any",
                  checkIn: next === "stays" || (next === "rent" && filters.dealType === "short") ? filters.checkIn : null,
                  checkOut: next === "stays" || (next === "rent" && filters.dealType === "short") ? filters.checkOut : null,
                  dealType: next === "rent" ? filters.dealType : "any",
                  locLng: next === "rent" ? filters.locLng : null,
                  locLat: next === "rent" ? filters.locLat : null,
                  locLabel: next === "rent" ? filters.locLabel : null,
                });
              }}
              className="rounded-[14px] border bg-surface px-2.5 py-3 text-left"
              style={{
                borderColor: filters.section === s.id ? "#17140F" : "#E4DCCE",
              }}
            >
              {sectionIcon(s.id)}
              <div className="mt-2 text-xs font-semibold leading-[1.25] text-ink">{t.sectionNames[s.id]}</div>
            </button>
          ))}
        </div>
        {filters.section === "rent" ? (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["any", t.any],
                  ["long", t.dealLong],
                  ["short", t.dealShort],
                  ["buy", t.dealBuy],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  active={filters.dealType === id}
                  onClick={() =>
                    setFilters({
                      dealType: id,
                      checkIn: id === "short" ? filters.checkIn : null,
                      checkOut: id === "short" ? filters.checkOut : null,
                    })
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["any", t.any],
                  ["apartment", t.apartment],
                  ["house", t.house],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={filters.housingType === id} onClick={() => setFilters({ housingType: id })}>
                  {label}
                </Chip>
              ))}
            </div>
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
            {filters.dealType === "short" ? (
              <StayCalendar
                checkIn={filters.checkIn}
                checkOut={filters.checkOut}
                onChange={(next) => setFilters(next)}
              />
            ) : null}
          </div>
        ) : null}
        {filters.section === "stays" ? (
          <div className="mt-3">
            <StayCalendar
              checkIn={filters.checkIn}
              checkOut={filters.checkOut}
              onChange={(next) => setFilters(next)}
            />
          </div>
        ) : null}
        {filters.section === "services" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={!filters.category} onClick={() => setFilters({ category: null })}>
              {t.allCategories}
            </Chip>
            {SERVICE_CATEGORIES.map((c) => (
              <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
                {t.cats[c]}
              </Chip>
            ))}
          </div>
        ) : null}

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
                  className="w-[148px] shrink-0 overflow-hidden rounded-2xl border border-line bg-surface text-left"
                >
                  <div className="h-24">
                    <Photo src={item.photos[0]} alt={listingTitle(item, lang)} />
                  </div>
                  <div className="px-[11px] pb-[11px] pt-[9px]">
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

        <div className="sc mt-[22px] flex gap-2 overflow-x-auto pb-0.5">
          {CITIES.map((id) => (
            <Chip key={id} active={city === id} onClick={() => setCity(id)}>
              {t.cities[id]}
            </Chip>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.fresh}</h2>
          <span className="text-[13px] font-semibold text-muted">{t.nListings(listings.length)}</span>
        </div>
        <div className="sc mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          <Chip onClick={() => router.push("/filters")}>
            {filters.section ? t.sectionNames[filters.section] : t.allCategories}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          <Chip onClick={() => router.push("/filters")}>
            {filters.sort === "new" ? t.newest : filters.sort === "price-asc" ? t.priceAsc : t.priceDesc}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          {filters.section === "stays" && filters.checkIn ? (
            <Chip onClick={() => router.push("/filters")}>
              {filters.checkOut
                ? formatStayRange(filters.checkIn, filters.checkOut, lang)
                : formatStayDay(filters.checkIn, lang)}
            </Chip>
          ) : null}
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
          <>
            {featured ? <ListingHero listing={featured} onFav={() => onFav(featured.id)} /> : null}
            <div className="mt-3 flex flex-col gap-3">
              {rest.map((item) => (
                <ListingRow key={item.id} listing={item} />
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs leading-[1.5] text-muted-2">{t.disclaimer}</p>
        <div className="ornament mt-[18px]" />
        <div className="mt-3.5 flex flex-col gap-1.5 pb-1.5">
          <span className="font-display text-base font-bold text-ink">{t.footerSlogan}</span>
          <span className="flex items-center gap-[7px] text-xs text-muted">
            <Flag />
            {t.country} · KGS
          </span>
        </div>
      </div>

      {cityOpen ? (
        <div className="absolute inset-0 z-20 flex items-end bg-black/30" onClick={() => setCityOpen(false)}>
          <div
            className="w-full rounded-t-[26px] bg-screen p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-toggle-off" />
            <div className="font-display text-lg font-bold text-ink">{t.city}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITIES.map((id) => (
                <Chip
                  key={id}
                  active={city === id}
                  accent={id !== "all" && city === id}
                  onClick={() => {
                    setCity(id);
                    setCityOpen(false);
                  }}
                >
                  {t.cities[id]}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PhoneShell>
  );
}
