"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, CITIES, SECTIONS, SERVICE_CATEGORIES } from "@/lib/data";
import { applyFilters } from "@/lib/filter";
import { searchPlaceholder } from "@/lib/i18n";
import { patchForSection } from "@/lib/section";
import { useApp } from "@/lib/store";
import { IconBack, IconHeart } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Eyebrow, Toggle } from "@/components/ui";
import { StayCalendar } from "@/components/stay-calendar";

export default function FiltersPage() {
  const { t, filters, setFilters, resetFilters, city, allListings, user, setPendingPath, saveCurrentSearch } =
    useApp();
  const router = useRouter();
  const count = applyFilters(allListings, filters, city).length;
  const [sectionPickerOpen, setSectionPickerOpen] = useState(!filters.section);

  useEffect(() => {
    setSectionPickerOpen(!filters.section);
  }, [filters.section]);

  const setRooms = (n: number | 0) => {
    if (n === 0) {
      setFilters({ rooms: [] });
      return;
    }
    const has = filters.rooms.includes(n);
    setFilters({ rooms: has ? filters.rooms.filter((r) => r !== n) : [...filters.rooms, n] });
  };

  const isRent = filters.section === "rent";
  const isSecondhand = filters.section === "secondhand";
  const isServices = filters.section === "services";
  const isAuto = filters.section === "cars";
  const isCarRental = isAuto && filters.autoType === "rent";
  const isStays = filters.section === "stays";

  const pickSection = (id: (typeof SECTIONS)[number]["id"]) => {
    if (filters.section === id) {
      setSectionPickerOpen(false);
      return;
    }
    setFilters(patchForSection(id, filters));
    setSectionPickerOpen(false);
  };

  const showAllSections = !filters.section || sectionPickerOpen;
  const searchPh = searchPlaceholder(filters.section, t);

  const priceLabel = isRent
    ? filters.dealType === "buy"
      ? t.priceSale
      : filters.dealType === "short"
        ? t.priceDayStay
        : filters.dealType === "long"
          ? t.priceMonth
          : t.priceKgs
    : isCarRental
      ? t.priceDay
      : filters.section === "stays"
        ? t.priceNight
        : t.priceKgs;

  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 pb-3.5 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <span className="font-display text-lg font-bold text-ink">{t.filters}</span>
        <button type="button" onClick={resetFilters} className="text-sm font-semibold text-accent">
          {t.resetFilters}
        </button>
      </div>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-6">
        <div
          className="flex h-12 items-center gap-2.5 rounded-2xl bg-white px-4"
          style={{ border: `1px solid ${filters.query ? "#17140F" : "#E4DCCE"}` }}
        >
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPh}
            className="h-full flex-1 bg-transparent text-[15px] outline-none"
          />
          {filters.query ? (
            <button type="button" onClick={() => setFilters({ query: "" })} className="text-base text-muted-2">
              ×
            </button>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>{t.section}</Eyebrow>
            {filters.section && !showAllSections ? (
              <button
                type="button"
                onClick={() => setSectionPickerOpen(true)}
                className="text-[13px] font-semibold text-accent"
              >
                {t.changeSection}
              </button>
            ) : null}
          </div>
          {showAllSections ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSection(s.id)}
                  className="rounded-xl px-3.5 py-2.5 text-sm"
                  style={{
                    background: filters.section === s.id ? "#17140F" : "#FFFFFF",
                    color: filters.section === s.id ? "#F7F3EC" : "#17140F",
                    border: filters.section === s.id ? "none" : "1px solid #E4DCCE",
                    fontWeight: filters.section === s.id ? 600 : 500,
                  }}
                >
                  {t.sectionNames[s.id]}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2.5">
              <Chip active onClick={() => setSectionPickerOpen(true)}>
                {t.sectionNames[filters.section!]}
              </Chip>
            </div>
          )}
        </div>

        {isRent ? (
          <div>
            <Eyebrow>{t.dealType}</Eyebrow>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(
                [
                  ["buy", t.dealBuy],
                  ["short", t.dealShort],
                  ["long", t.dealLong],
                  ["any", t.any],
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
                      stockType: id === "buy" ? filters.stockType : "any",
                    })
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
            {filters.dealType === "buy" ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(
                  [
                    ["any", t.any],
                    ["newbuild", t.stockNew],
                    ["resale", t.stockResale],
                  ] as const
                ).map(([id, label]) => (
                  <Chip key={id} active={filters.stockType === id} onClick={() => setFilters({ stockType: id })}>
                    {label}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {isRent ? (
          <div>
            <Eyebrow>{t.housingType}</Eyebrow>
            <div className="mt-2.5 flex flex-wrap gap-2">
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
          </div>
        ) : null}

        {isRent ? (
          <div>
            <Eyebrow>2ГИС</Eyebrow>
            <button
              type="button"
              onClick={() => router.push("/map")}
              className="mt-2.5 flex w-full items-center justify-between rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
            >
              <span className="text-[15px] font-semibold text-ink">{filters.locLabel ?? t.pickOnMap}</span>
              <span className="text-[13px] font-semibold text-accent">{t.mapMode}</span>
            </button>
            {filters.locLabel ? (
              <button
                type="button"
                onClick={() => setFilters({ locLat: null, locLng: null, locLabel: null })}
                className="mt-2 text-[13px] font-semibold text-accent"
              >
                {t.clearLocation}
              </button>
            ) : null}
          </div>
        ) : null}

        {isRent && filters.dealType === "short" ? (
          <div>
            <Eyebrow>
              {t.checkIn} / {t.checkOut}
            </Eyebrow>
            <div className="mt-2.5">
              <StayCalendar
                checkIn={filters.checkIn}
                checkOut={filters.checkOut}
                onChange={(next) => setFilters(next)}
              />
            </div>
          </div>
        ) : null}

        {isStays ? (
          <div>
            <Eyebrow>{t.checkIn} / {t.checkOut}</Eyebrow>
            <div className="mt-2.5">
              <StayCalendar
                checkIn={filters.checkIn}
                checkOut={filters.checkOut}
                onChange={(next) => setFilters(next)}
              />
            </div>
          </div>
        ) : null}

        {isAuto ? (
          <div>
            <Eyebrow>{t.dealType}</Eyebrow>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(
                [
                  ["sale", t.autoSale],
                  ["rent", t.autoRent],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  active={filters.autoType === id}
                  onClick={() =>
                    setFilters({
                      autoType: id,
                      gear: id === "rent" ? filters.gear : "any",
                    })
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {isAuto ? (
          <div>
            <Eyebrow>{t.bodyType}</Eyebrow>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(
                [
                  ["any", t.any],
                  ["sedan", t.sedan],
                  ["suv", t.suv],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={filters.bodyType === id} onClick={() => setFilters({ bodyType: id })}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {isCarRental ? (
          <div>
            <Eyebrow>{t.gear}</Eyebrow>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(
                [
                  ["any", t.any],
                  ["auto", t.auto],
                  ["manual", t.manual],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={filters.gear === id} onClick={() => setFilters({ gear: id })}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {isSecondhand ? (
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Chip
              active={!filters.category}
              onClick={() => setFilters({ category: null })}
            >
              {t.allCategories}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
                {t.cats[c]}
              </Chip>
            ))}
          </div>
        </div>
        ) : null}

        {isServices ? (
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Chip active={!filters.category} onClick={() => setFilters({ category: null })}>
              {t.allCategories}
            </Chip>
            {SERVICE_CATEGORIES.map((c) => (
              <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
                {t.cats[c]}
              </Chip>
            ))}
          </div>
        </div>
        ) : null}

        <div>
          <Eyebrow>{t.sort}</Eyebrow>
          <div className="mt-2.5 flex gap-2">
            {(
              [
                ["new", t.newest],
                ["price-asc", t.priceAsc],
                ["price-desc", t.priceDesc],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilters({ sort: id })}
                className="flex-1 rounded-xl py-[11px] text-center text-sm font-semibold"
                style={{
                  background: filters.sort === id ? "#17140F" : "#FFFFFF",
                  color: filters.sort === id ? "#F7F3EC" : "#17140F",
                  border: filters.sort === id ? "none" : "1px solid #E4DCCE",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Eyebrow>{t.city}</Eyebrow>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[...CITIES].sort((a, b) => (a === "all" ? 1 : b === "all" ? -1 : 0)).map((id) => (
              <Chip
                key={id}
                active={filters.city === id}
                accent={id !== "all" && filters.city === id}
                onClick={() => setFilters({ city: id })}
              >
                {t.cities[id]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Eyebrow>{priceLabel}</Eyebrow>
            <span className="text-[13px] font-semibold text-ink">
              {filters.priceMin ?? 0} — {filters.priceMax ?? "∞"}
            </span>
          </div>
          <div className="mt-4 flex gap-2.5">
            <input
              inputMode="numeric"
              value={filters.priceMin ?? ""}
              placeholder="20 000"
              onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value.replace(/\s/g, "")) : null })}
              className="h-[46px] flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none"
            />
            <input
              inputMode="numeric"
              value={filters.priceMax ?? ""}
              placeholder="45 000"
              onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value.replace(/\s/g, "")) : null })}
              className="h-[46px] flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none"
            />
          </div>
        </div>

        {isRent ? (
        <div>
          <Eyebrow>{t.rooms}</Eyebrow>
          <div className="mt-2.5 flex gap-2">
            {[
              [0, t.anyRooms],
              [1, "1"],
              [2, "2"],
              [3, "3"],
              [4, "4+"],
            ].map(([n, label]) => {
              const active = n === 0 ? filters.rooms.length === 0 : filters.rooms.includes(n as number);
              return (
                <button
                  key={String(n)}
                  type="button"
                  onClick={() => setRooms(n as number)}
                  className="flex-1 rounded-xl py-[11px] text-center text-sm font-semibold"
                  style={{
                    background: active ? "#17140F" : "#FFFFFF",
                    color: active ? "#F7F3EC" : n === 0 ? "#6E6558" : "#17140F",
                    border: active ? "none" : "1px solid #E4DCCE",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

        <div className="flex flex-col">
          {(
            [
              ["photosOnly", t.photosOnly],
              ["verifiedOnly", t.verifiedOwners],
              ["noAgents", t.noAgents],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between border-t border-line py-3.5">
              <span className="text-[15px] text-ink">{label}</span>
              <Toggle on={Boolean(filters[key])} onChange={() => setFilters({ [key]: !filters[key] })} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 gap-2.5 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              setPendingPath("/filters");
              router.push("/login");
              return;
            }
            saveCurrentSearch();
            router.push("/favorites");
          }}
          className="flex h-[54px] w-14 items-center justify-center rounded-2xl border border-line bg-white"
          aria-label={t.saveSearch}
        >
          <IconHeart size={19} color="#17140F" />
        </button>
        <button
          type="button"
          onClick={() => router.push(filters.section ? `/section/${filters.section}` : "/")}
          className="shadow-btn flex h-[54px] flex-1 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.showN(count)}
        </button>
      </div>
    </PhoneShell>
  );
}
