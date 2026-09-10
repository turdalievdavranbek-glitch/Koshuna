"use client";

import { useRouter } from "next/navigation";
import { CONSTRUCTION_CATEGORIES, SERVICE_CATEGORIES, propertyIsLiving } from "@/lib/data";
import { patchForSection } from "@/lib/section";
import { useApp } from "@/lib/store";
import { StayCalendar } from "@/components/stay-calendar";
import { SecondhandChips } from "@/components/secondhand-chips";
import { PropertyTypeChips } from "@/components/property-chips";
import { DealTypeChips } from "@/components/deal-chips";
import { AnimalChips } from "@/components/animal-chips";
import { CarMakeChips } from "@/components/car-chips";
import { ConstructionChips } from "@/components/construction-chips";
import { RestaurantChips } from "@/components/restaurant-chips";
import { LocationChips } from "@/components/location-chips";
import { SectionList } from "@/components/section-list";
import { Chip } from "@/components/ui";

export function SectionExtras() {
  const { t, filters, setFilters } = useApp();
  const router = useRouter();
  const section = filters.section;

  if (section === "rent") {
    return (
      <div className="flex flex-col gap-3">
        <DealTypeChips labeled />
        <PropertyTypeChips list />
        <LocationChips labeled />
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
    return (
      <div className="flex flex-col gap-3">
        <SecondhandChips list />
        <button
          type="button"
          onClick={() => {
            setFilters(patchForSection("construction", filters));
            router.push("/section/construction");
          }}
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
          <span className="text-[15px] font-semibold text-accent">→</span>
        </button>
      </div>
    );
  }

  if (section === "cars") {
    return (
      <div className="flex flex-col gap-3">
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
        <CarMakeChips list />
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
    return <AnimalChips list />;
  }

  if (section === "services") {
    return (
      <SectionList
        title={t.category}
        rows={[
          { id: "all", label: t.allCategories, active: !filters.category, onClick: () => setFilters({ category: null }) },
          ...SERVICE_CATEGORIES.map((c) => ({
            id: c,
            label: t.cats[c],
            active: filters.category === c,
            onClick: () => setFilters({ category: c }),
          })),
        ]}
      />
    );
  }

  if (section === "construction") {
    return <ConstructionChips list />;
  }

  if (section === "restaurants") {
    return (
      <div className="flex flex-col gap-3">
        <RestaurantChips list />
        <LocationChips labeled />
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
