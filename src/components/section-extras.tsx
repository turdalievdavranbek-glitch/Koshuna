"use client";

import { useRouter } from "next/navigation";
import { SERVICE_CATEGORIES, propertyIsLiving, propertyShowsStock } from "@/lib/data";
import { useApp } from "@/lib/store";
import { StayCalendar } from "@/components/stay-calendar";
import { SecondhandChips } from "@/components/secondhand-chips";
import { PropertyTypeChips } from "@/components/property-chips";
import { AnimalChips } from "@/components/animal-chips";
import { CarMakeChips } from "@/components/car-chips";
import { ConstructionChips } from "@/components/construction-chips";
import { Chip } from "@/components/ui";

export function SectionExtras() {
  const { t, filters, setFilters } = useApp();
  const router = useRouter();
  const section = filters.section;

  if (section === "rent") {
    return (
      <div className="flex flex-col gap-2.5">
        <PropertyTypeChips />
        <div className="flex flex-wrap gap-2">
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
                  checkIn: id === "short" && propertyIsLiving(filters.housingType) ? filters.checkIn : null,
                  checkOut: id === "short" && propertyIsLiving(filters.housingType) ? filters.checkOut : null,
                  stockType: id === "buy" ? filters.stockType : "any",
                })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
        {filters.dealType === "buy" && propertyShowsStock(filters.housingType) ? (
          <div className="flex flex-wrap gap-2">
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
        {filters.dealType === "short" && propertyIsLiving(filters.housingType) ? (
          <StayCalendar
            checkIn={filters.checkIn}
            checkOut={filters.checkOut}
            onChange={(next) => setFilters(next)}
          />
        ) : null}
      </div>
    );
  }

  if (section === "secondhand") {
    return <SecondhandChips />;
  }

  if (section === "cars") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
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
        <CarMakeChips />
        <div className="flex flex-wrap gap-2">
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
        {filters.autoType === "rent" ? (
          <div className="flex flex-wrap gap-2">
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
        ) : null}
      </div>
    );
  }

  if (section === "stays") {
    return (
      <StayCalendar
        checkIn={filters.checkIn}
        checkOut={filters.checkOut}
        onChange={(next) => setFilters(next)}
      />
    );
  }

  if (section === "animals") {
    return <AnimalChips />;
  }

  if (section === "services") {
    return (
      <div className="flex flex-wrap gap-2">
        <Chip active={!filters.category} onClick={() => setFilters({ category: null })}>
          {t.allCategories}
        </Chip>
        {SERVICE_CATEGORIES.map((c) => (
          <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
            {t.cats[c]}
          </Chip>
        ))}
      </div>
    );
  }

  if (section === "construction") {
    return <ConstructionChips />;
  }

  return null;
}
