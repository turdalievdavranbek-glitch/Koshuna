"use client";

import { CATEGORIES, RESTAURANT_CATEGORIES, SERVICE_TOP, ANIMAL_GROUPS, goodsKindsOf } from "@/lib/data";
import { isSectionVisible } from "@/lib/features";
import { clearFreshListPatch } from "@/lib/filter";
import { housingKindOfRealty, REALTY_GROUPS } from "@/lib/realty";
import { patchForSection } from "@/lib/section";
import { applySellerShopCategory } from "@/components/shop-chips";
import { isShopCategory, isShopKind, parentOfShopKind, shopKindsOf, SHOP_CATEGORIES } from "@/lib/shops";
import { JOB_SPHERES } from "@/lib/vacancies";
import { shownLocationLabel } from "@/components/location-line";
import { openLocationPicker } from "@/components/location-line";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { Chip } from "@/components/ui";
import { IconCheck, IconPin, IconSliders } from "@/components/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const HOME_SECTIONS: SectionId[] = [
  "shops",
  "restaurants",
  "rent",
  "cars",
  "vacancies",
  "services",
  "secondhand",
  "animals",
  "stays",
];

function SmChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Chip size="xs" active={active} onClick={onClick}>
      {children}
    </Chip>
  );
}

function ChipRow({ children, testId, className = "" }: { children: React.ReactNode; testId: string; className?: string }) {
  return (
    <div className={`relative min-w-0 max-w-full ${className}`}>
      <div
        className="sc flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto pb-0.5 pr-6 desk:flex-wrap desk:overflow-visible desk:pr-0"
        data-testid={testId}
      >
        {children}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-screen to-transparent desk:hidden"
      />
    </div>
  );
}

export function HomeFreshFilters() {
  const { t, lang, city, filters, setFilters } = useApp();
  const router = useRouter();
  const section = filters.section;
  const shopParent = isShopKind(filters.category)
    ? parentOfShopKind(filters.category)
    : isShopCategory(filters.category)
      ? filters.category
      : null;
  const shopKinds = shopParent ? shopKindsOf(shopParent) : [];
  const goodsKinds = section === "secondhand" ? goodsKindsOf(filters.category) : [];
  const dirty =
    Boolean(section) ||
    filters.neighborOnly ||
    filters.priceDroppedOnly ||
    filters.videoOnly ||
    filters.sort !== "new" ||
    Boolean(filters.category);

  const [panel, setPanel] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortNow = filters.sort === "price-asc" || filters.sort === "price-desc" ? filters.sort : "new";
  useEffect(() => {
    if (!sortOpen && !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSortOpen(false);
      setPanel(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sortOpen, panel]);
  const toggles = [filters.neighborOnly, filters.priceDroppedOnly, filters.videoOnly].filter(Boolean).length;

  const pickSection = (id: SectionId | null) => {
    if (!id) {
      setFilters(clearFreshListPatch(filters));
      return;
    }
    setFilters(id === "shops" ? applySellerShopCategory(null) : patchForSection(id, filters));
  };

  return (
    <div className="mt-2.5 min-w-0 max-w-full" data-testid="fresh-nearby-filters">
      <button
        type="button"
        onClick={() => openLocationPicker(router, "/")}
        className="mb-2 flex max-w-full items-center gap-1 text-left text-[11px] font-semibold text-muted"
        data-testid="fresh-location"
      >
        <IconPin size={12} color="#B8452F" />
        <span className="truncate">
          {shownLocationLabel(lang, city, filters, t)}
        </span>
      </button>

      {/* Sections. Phones: one scrolling row with a fade hint; desktop: wraps, never wider than the page. */}
      <ChipRow testId="fresh-chip-row">
        <SmChip active={!section} onClick={() => pickSection(null)}>
          {t.freshAll}
        </SmChip>
        {HOME_SECTIONS.filter(isSectionVisible).map((id) => (
          <SmChip key={id} active={section === id} onClick={() => pickSection(section === id ? null : id)}>
            {id === "shops" ? t.freshShops : id === "restaurants" ? t.freshFood : t.sectionNames[id]}
          </SmChip>
        ))}
      </ChipRow>
      {section ? (
        <ChipRow testId="fresh-sub-row" className="mt-1.5">
        {section === "shops"
            ? SHOP_CATEGORIES.map((id) => (
                <SmChip
                  key={id}
                  active={filters.category === id || shopParent === id}
                  onClick={() => setFilters(applySellerShopCategory(filters.category === id ? null : id))}
                >
                  {t.shopCats[id]}
                </SmChip>
              ))
            : null}
          {section === "shops"
            ? shopKinds.map((id) => (
                <SmChip key={id} active={filters.category === id} onClick={() => setFilters({ section: "shops", category: id })}>
                  {t.shopKinds[id]}
                </SmChip>
              ))
            : null}
          {section === "restaurants"
            ? RESTAURANT_CATEGORIES.map((id) => (
                <SmChip
                  key={id}
                  active={filters.category === id}
                  onClick={() => setFilters({ category: filters.category === id ? null : id })}
                >
                  {t.cats[id]}
                </SmChip>
              ))
            : null}
          {section === "rent"
            ? REALTY_GROUPS.map((id) => (
                <SmChip
                  key={id}
                  active={filters.realtyGroup === id}
                  onClick={() =>
                    setFilters({
                      realtyGroup: filters.realtyGroup === id ? "any" : id,
                      realtySub: "any",
                      realtyKind: "any",
                      housingType: filters.realtyGroup === id ? "any" : housingKindOfRealty(id),
                      rooms: [],
                    })
                  }
                >
                  {t.realtyGroups[id]}
                </SmChip>
              ))
            : null}
          {section === "cars" ? (
            <>
              <SmChip
                active={filters.vehicleGroup === "passenger"}
                onClick={() =>
                  setFilters({
                    vehicleGroup: filters.vehicleGroup === "passenger" ? "any" : "passenger",
                    bodyType: "any",
                    carMake: "any",
                    carModel: "any",
                  })
                }
              >
                {t.vehicleGroups.passenger}
              </SmChip>
              <SmChip
                active={filters.vehicleGroup === "special"}
                onClick={() =>
                  setFilters({
                    vehicleGroup: filters.vehicleGroup === "special" ? "any" : "special",
                    bodyType: "any",
                    carMake: "any",
                    carModel: "any",
                  })
                }
              >
                {t.vehicleGroups.special}
              </SmChip>
              <SmChip active={filters.autoType === "sale"} onClick={() => setFilters({ autoType: "sale", gear: "any" })}>
                {t.autoSale}
              </SmChip>
              <SmChip active={filters.autoType === "rent"} onClick={() => setFilters({ autoType: "rent" })}>
                {t.autoRent}
              </SmChip>
            </>
          ) : null}
          {section === "vacancies"
            ? JOB_SPHERES.map((id) => (
                <SmChip
                  key={id}
                  active={filters.jobSphere === id}
                  onClick={() =>
                    setFilters({
                      jobSphere: filters.jobSphere === id ? "any" : id,
                      jobSub: "any",
                      jobRole: "any",
                    })
                  }
                >
                  {t.jobSpheres[id]}
                </SmChip>
              ))
            : null}
          {section === "services"
            ? SERVICE_TOP.map((id) => (
                <SmChip
                  key={id}
                  active={filters.category === id}
                  onClick={() => setFilters({ category: filters.category === id ? null : id })}
                >
                  {t.cats[id]}
                </SmChip>
              ))
            : null}
          {section === "secondhand"
            ? CATEGORIES.map((id) => (
                <SmChip
                  key={id}
                  active={filters.category === id}
                  onClick={() =>
                    setFilters({
                      category: filters.category === id ? null : id,
                      goodsKind: "any",
                      techBrand: "any",
                      techModel: "any",
                    })
                  }
                >
                  {t.cats[id]}
                </SmChip>
              ))
            : null}
          {section === "secondhand"
            ? goodsKinds.map((id) => (
                <SmChip
                  key={id}
                  active={filters.goodsKind === id}
                  onClick={() => setFilters({ goodsKind: filters.goodsKind === id ? "any" : id })}
                >
                  {t.goodsKinds[id]}
                </SmChip>
              ))
            : null}
          {section === "animals"
            ? ANIMAL_GROUPS.map((id) => (
                <SmChip
                  key={id}
                  active={filters.animalGroup === id}
                  onClick={() =>
                    setFilters({
                      animalGroup: filters.animalGroup === id ? "any" : id,
                      animalKind: "any",
                    })
                  }
                >
                  {t.animalGroups[id] ?? id}
                </SmChip>
              ))
            : null}
        </ChipRow>
      ) : null}

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5" data-testid="fresh-tools">
        <div className="relative shrink-0">
          <button
            type="button"
            data-testid="fresh-sort"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onClick={() => {
              setPanel(false);
              setSortOpen(true);
            }}
            className="flex h-7 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink"
          >
            <span className="text-muted">{t.sort}:</span>
            {sortNow === "price-asc" ? t.priceAsc : sortNow === "price-desc" ? t.priceDesc : t.newestShort}
            <span className="text-[9px] text-muted" aria-hidden>
              ▼
            </span>
          </button>
          {sortOpen ? (
            <>
              {/* Full-screen backdrop: any outside click (including on the chip) closes; no open/close race. */}
              <button
                type="button"
                aria-label={t.freshClose}
                className="fixed inset-0 z-[60] cursor-default bg-[rgba(23,20,15,.25)] desk:bg-transparent"
                onClick={() => setSortOpen(false)}
              />
              <div
                role="menu"
                data-testid="fresh-sort-menu"
                className="fixed inset-x-0 bottom-0 z-[61] rounded-t-[22px] border border-line bg-surface p-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(23,20,15,.16)] desk:absolute desk:inset-x-auto desk:bottom-auto desk:left-0 desk:top-9 desk:min-w-[220px] desk:rounded-[16px] desk:p-1.5 desk:shadow-[0_12px_32px_rgba(23,20,15,.14)]"
              >
                <div className="px-3 pb-1 pt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted desk:hidden">{t.sort}</div>
                {(
                  [
                    ["new", t.sortMenuNew],
                    ["price-asc", t.sortMenuCheap],
                    ["price-desc", t.sortMenuDear],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortNow === id}
                    data-testid={`fresh-sort-${id}`}
                    onClick={() => {
                      setFilters({ sort: id });
                      setSortOpen(false);
                    }}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-[12px] px-3 text-left text-[15px] font-semibold text-ink hover:bg-chip desk:h-10 desk:text-[14px]"
                  >
                    {label}
                    {sortNow === id ? <IconCheck size={16} color="#B8452F" /> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            data-testid="fresh-filters"
            aria-expanded={panel}
            onClick={() => {
              setSortOpen(false);
              setPanel((v) => !v);
            }}
            className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold ${
              toggles ? "border-ink bg-ink text-screen" : "border-line bg-surface text-ink"
            }`}
          >
            <IconSliders size={12} color={toggles ? "#F7F3EC" : "#17140F"} />
            {t.filters}
            {toggles ? <span className="ml-0.5">· {toggles}</span> : null}
          </button>
          {panel ? (
            <>
              <button type="button" aria-label={t.freshClose} className="fixed inset-0 z-30 cursor-default" onClick={() => setPanel(false)} />
              <div
                data-testid="fresh-filters-panel"
                className="absolute left-0 top-9 z-40 w-[min(260px,calc(100vw-40px))] rounded-[16px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(23,20,15,.14)]"
              >
                {(
                  [
                    ["neighborOnly", t.fromNeighbor],
                    ["priceDroppedOnly", t.priceDropped],
                    ["videoOnly", t.videoOnly],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`fresh-toggle-${key}`}
                    onClick={() => setFilters({ [key]: !filters[key] })}
                    className="flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-chip"
                  >
                    {label}
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                        filters[key] ? "border-accent bg-accent text-accent-on" : "border-line bg-white text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {dirty ? (
          <button
            type="button"
            onClick={() => setFilters(clearFreshListPatch(filters))}
            className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px] font-semibold text-accent"
          >
            {t.freshReset}
          </button>
        ) : null}
      </div>
    </div>
  );
}
