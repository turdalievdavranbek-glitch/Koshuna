"use client";

import { useRouter } from "next/navigation";
import { SECTIONS, SERVICE_TOP, SHOP_ART } from "@/lib/data";
import { FEATURES, isSectionVisible } from "@/lib/features";
import { applyFilters, clearMapPoint } from "@/lib/filter";
import { searchPlaceholder } from "@/lib/i18n";
import { realtyIsLiving } from "@/lib/realty";
import { patchForSection } from "@/lib/section";
import { feedHrefFromFilters, sectionHref } from "@/lib/section-tree";
import { shownLocationLabel } from "@/components/location-line";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";
import { IconBack, IconHeart } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Eyebrow, Toggle } from "@/components/ui";
import { openLocationPicker } from "@/components/location-line";
import { StayCalendar } from "@/components/stay-calendar";
import { SecondhandChips } from "@/components/secondhand-chips";
import { RealtyChips } from "@/components/realty-chips";
import { DealTypeChips } from "@/components/deal-chips";
import { SellerKindChips } from "@/components/seller-chips";
import { AnimalChips } from "@/components/animal-chips";
import { CarMakeChips } from "@/components/car-chips";
import { ConstructionChips } from "@/components/construction-chips";
import { RestaurantChips } from "@/components/restaurant-chips";
import { VacancyChips } from "@/components/vacancy-chips";
import { ShopCategoryChips } from "@/components/shop-chips";

export default function FiltersPage() {
  const { t, lang, filters, setFilters, resetFilters, city, allListings, user, setPendingPath, saveCurrentSearch } =
    useApp();
  const router = useRouter();
  const count = applyFilters(allListings, filters, city).length;

  const isRent = filters.section === "rent";
  const isSecondhand = filters.section === "secondhand";
  const isServices = filters.section === "services";
  const isAnimals = filters.section === "animals";
  const isAuto = filters.section === "cars";
  const isCarRental = isAuto && filters.autoType === "rent";
  const isStays = filters.section === "stays";
  const isConstruction = filters.section === "construction";
  const isRestaurants = filters.section === "restaurants";
  const isVacancies = filters.section === "vacancies";
  const isShops = filters.section === "shops";

  const openSection = (id: (typeof SECTIONS)[number]["id"]) => {
    setFilters(patchForSection(id, filters));
    router.push(sectionHref(id));
  };

  const searchPh = searchPlaceholder(filters.section, t);

  const priceLabel = isRent
    ? filters.dealType === "buy"
      ? t.priceSale
      : filters.dealType === "short"
        ? t.priceDayStay
        : filters.dealType === "long" || filters.dealType === "share"
          ? t.priceMonth
          : t.priceKgs
    : isCarRental
      ? t.priceDay
      : filters.section === "stays"
        ? t.priceNight
        : filters.section === "vacancies"
          ? t.priceMonth
          : t.priceKgs;

  return (
    <PhoneShell>
      <div className="flex w-full min-w-0 items-center justify-between gap-2 px-5 pb-3.5 pt-1">
        <button
          type="button"
          onClick={() => goBack(router, "/search")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <span className="min-w-0 truncate font-display text-lg font-bold text-ink">{t.filters}</span>
        <button type="button" onClick={resetFilters} className="shrink-0 text-sm font-semibold text-accent" data-testid="filters-reset">
          {t.filterReset}
        </button>
      </div>

      <div data-testid="filters-scroll" className="sc flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto px-5 pb-5">
        <div
          className="flex h-12 min-w-0 items-center gap-2.5 rounded-2xl bg-white px-4"
          style={{ border: `1px solid ${filters.query ? "#17140F" : "#E4DCCE"}` }}
        >
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPh}
            className="box-border h-full w-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          {filters.query ? (
            <button type="button" onClick={() => setFilters({ query: "" })} className="text-base text-muted-2">
              ×
            </button>
          ) : null}
        </div>

        <div>
          <Eyebrow>{t.section}</Eyebrow>
          <div className="mt-2.5 overflow-hidden rounded-[16px] border border-line bg-surface">
            <button
              type="button"
              onClick={() => setFilters(patchForSection("shops", filters))}
              className="flex w-full min-w-0 items-center gap-3 px-3 py-[10px] text-left"
              style={{ background: isShops ? "#17140F" : "#FFFFFF" }}
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-[#eee8dc]">
                <img src={SHOP_ART} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold" style={{ color: isShops ? "#F7F3EC" : "#17140F" }}>
                {t.sectionNames.shops}
              </span>
              <span style={{ color: isShops ? "rgba(247,243,236,.45)" : "#A79C8C" }}>›</span>
            </button>
            {SECTIONS.filter((s) => isSectionVisible(s.id)).map((s) => {
              const on = filters.section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openSection(s.id)}
                  className="flex w-full min-w-0 items-center gap-3 border-t border-line px-3 py-[10px] text-left"
                  style={{
                    background: on ? "#17140F" : "#FFFFFF",
                  }}
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-[#eee8dc]">
                    <img src={s.art} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span
                    className="min-w-0 flex-1 text-[15px] font-semibold"
                    style={{ color: on ? "#F7F3EC" : "#17140F" }}
                  >
                    {t.sectionNames[s.id]}
                  </span>
                  <span style={{ color: on ? "rgba(247,243,236,.45)" : "#A79C8C" }}>›</span>
                </button>
              );
            })}
          </div>
        </div>

        {isRent ? <DealTypeChips labeled /> : null}

        {isRent ? <RealtyChips labeled /> : null}

        {isRent ? <SellerKindChips labeled /> : null}
        {isAuto ? <SellerKindChips labeled variant="auto" /> : null}

        {isRent || isRestaurants ? (
          <div>
            <Eyebrow>{t.mapEyebrow}</Eyebrow>
            <button
              type="button"
              onClick={() => router.push("/map")}
              className="mt-2.5 flex w-full min-w-0 items-center justify-between gap-2 rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
            >
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{filters.locLabel ?? t.pickOnMap}</span>
              <span className="text-[13px] font-semibold text-accent">{t.mapMode}</span>
            </button>
            {filters.locLabel ? (
              <button
                type="button"
                onClick={() => setFilters(clearMapPoint(filters))}
                className="mt-2 text-[13px] font-semibold text-accent"
              >
                {t.clearLocation}
              </button>
            ) : null}
          </div>
        ) : null}

        {isRent && filters.dealType === "short" && realtyIsLiving(filters.realtyGroup, filters.housingType) ? (
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

        {isAuto ? <CarMakeChips labeled /> : null}

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

        {isSecondhand ? <SecondhandChips labeled /> : null}

        {isAnimals ? <AnimalChips labeled /> : null}

        {isServices ? (
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SERVICE_TOP.map((c) => (
              <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: filters.category === c ? null : c })}>
                {t.cats[c]}
              </Chip>
            ))}
          </div>
        </div>
        ) : null}

        {isConstruction ? <ConstructionChips labeled /> : null}

        {isRestaurants ? <RestaurantChips labeled /> : null}

        {isVacancies ? <VacancyChips labeled /> : null}

        {isShops ? <ShopCategoryChips labeled list /> : null}

        <div>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <Eyebrow>{priceLabel}</Eyebrow>
            <span className="shrink-0 text-[13px] font-semibold text-ink">
              {filters.priceMin ?? 0} — {filters.priceMax ?? "∞"}
            </span>
          </div>
          <div className="mt-4 flex min-w-0 gap-2.5">
            <input
              inputMode="numeric"
              value={filters.priceMin ?? ""}
              placeholder="20 000"
              onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value.replace(/\s/g, "")) : null })}
              className="box-border h-[46px] w-full min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none"
            />
            <input
              inputMode="numeric"
              value={filters.priceMax ?? ""}
              placeholder="45 000"
              onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value.replace(/\s/g, "")) : null })}
              className="box-border h-[46px] w-full min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none"
            />
          </div>
          <div data-testid="filters-price-chips" className="mt-2.5 flex flex-wrap gap-2">
            {(
              [
                { id: "to-1000", min: null, max: 1000, label: t.priceUpTo(1000) },
                { id: "to-5000", min: null, max: 5000, label: t.priceUpTo(5000) },
                { id: "to-20000", min: null, max: 20000, label: t.priceUpTo(20000) },
                { id: "to-50000", min: null, max: 50000, label: t.priceUpTo(50000) },
                { id: "from-50000", min: 50000, max: null, label: t.priceChipFrom(50000) },
              ] as const
            ).map((chip) => {
              const on = filters.priceMin === chip.min && filters.priceMax === chip.max;
              return (
                <Chip
                  key={chip.id}
                  active={on}
                  onClick={() => setFilters(on ? { priceMin: null, priceMax: null } : { priceMin: chip.min, priceMax: chip.max })}
                >
                  {chip.label}
                </Chip>
              );
            })}
          </div>
          <div className="mt-3" data-testid="filters-promo">
            <Chip active={filters.priceDroppedOnly} onClick={() => setFilters({ priceDroppedOnly: !filters.priceDroppedOnly })}>
              {t.filterPromo}
            </Chip>
          </div>
        </div>

        <div>
          <Eyebrow>{t.filterDistrict}</Eyebrow>
          <button
            type="button"
            data-testid="filters-district"
            onClick={() => openLocationPicker(router, "/filters")}
            className="mt-2.5 flex w-full min-w-0 items-center justify-between gap-2 rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
          >
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">
              {shownLocationLabel(lang, city, filters, t)}
            </span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        </div>

        <div>
          <Eyebrow>{t.sort}</Eyebrow>
          <div data-testid="filters-sort" className="mt-2.5 flex min-w-0 flex-wrap gap-2">
            {(
              [
                ["new", t.newestShort],
                ["price-asc", t.sortCheaper],
                ["price-desc", t.sortDearer],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilters({ sort: id })}
                className="box-border max-w-full min-w-0 rounded-xl px-3.5 py-[11px] text-center text-sm font-semibold"
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
          <Eyebrow>{t.postedAge}</Eyebrow>
          <div data-testid="filters-age" className="mt-2.5 flex flex-wrap gap-2">
            {(
              [
                ["today", t.postedToday],
                ["3d", t.posted3d],
                ["week", t.postedWeek],
                ["month", t.postedMonth],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                active={filters.postedWithin === id}
                onClick={() => setFilters({ postedWithin: filters.postedWithin === id ? "any" : id })}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          {(
            [
              ["photosOnly", t.withPhoto],
              ["videoOnly", t.withVideo],
              ["verifiedOnly", t.verifiedOwners],
              ["noAgents", t.noAgents],
              ...(isRent ? [] : ([["neighborOnly", t.neighborOnly]] as const)),
              ...(FEATURES.aiyl ? ([["aiylOnly", t.bridgeAiyl]] as const) : []),
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex min-w-0 items-center justify-between gap-3 border-t border-line py-3.5">
              <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink">{label}</span>
              <Toggle on={Boolean(filters[key])} onChange={() => setFilters({ [key]: !filters[key] })} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full min-w-0 shrink-0 gap-2.5 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
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
          onClick={() => router.push(feedHrefFromFilters(filters))}
          data-testid="filters-show"
          className="shadow-btn box-border flex h-[54px] min-w-0 flex-1 items-center justify-center rounded-2xl bg-accent px-3 text-center text-base font-semibold text-accent-on"
        >
          {t.showN(count)}
        </button>
      </div>
    </PhoneShell>
  );
}
