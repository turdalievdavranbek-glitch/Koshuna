"use client";

import { CATEGORIES, RESTAURANT_CATEGORIES, SERVICE_CATEGORIES, ANIMAL_GROUPS, goodsKindsOf } from "@/lib/data";
import { clearFreshListPatch } from "@/lib/filter";
import { housingKindOfRealty, REALTY_GROUPS } from "@/lib/realty";
import { patchForSection } from "@/lib/section";
import { applySellerShopCategory } from "@/components/shop-chips";
import { isShopCategory, isShopKind, parentOfShopKind, shopKindsOf, SHOP_CATEGORIES } from "@/lib/shops";
import { JOB_SPHERES } from "@/lib/vacancies";
import { locationLineLabel } from "@/lib/places";
import { openLocationPicker } from "@/components/location-line";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { Chip } from "@/components/ui";
import { IconPin } from "@/components/icons";
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
    <Chip size="sm" active={active} onClick={onClick}>
      {children}
    </Chip>
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

  const pickSection = (id: SectionId | null) => {
    if (!id) {
      setFilters(clearFreshListPatch(filters));
      return;
    }
    setFilters(id === "shops" ? applySellerShopCategory(null) : patchForSection(id, filters));
  };

  return (
    <div className="mt-2.5" data-testid="fresh-nearby-filters">
      <button
        type="button"
        onClick={() => openLocationPicker(router, "/")}
        className="mb-2 flex max-w-full items-center gap-1 text-left text-[11px] font-semibold text-muted"
        data-testid="fresh-location"
      >
        <IconPin size={12} color="#B8452F" />
        <span className="truncate">
          {locationLineLabel(lang, city, filters, t.cities, t.oblasts, t.locationRefine, t.locationCountryHint)}
        </span>
      </button>

      <div className="sc flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5" data-testid="fresh-chip-row">
        <SmChip active={!section} onClick={() => pickSection(null)}>
          {t.freshAll}
        </SmChip>
        {HOME_SECTIONS.map((id) => (
          <SmChip key={id} active={section === id} onClick={() => pickSection(section === id ? null : id)}>
            {id === "shops" ? t.homeQuickBazaar : id === "restaurants" ? t.homeQuickFood : t.sectionNames[id]}
          </SmChip>
        ))}
        <SmChip active={filters.neighborOnly} onClick={() => setFilters({ neighborOnly: !filters.neighborOnly })}>
          {t.fromNeighbor}
        </SmChip>
        <SmChip
          active={filters.priceDroppedOnly}
          onClick={() => setFilters({ priceDroppedOnly: !filters.priceDroppedOnly })}
        >
          {t.priceDropped}
        </SmChip>
        <SmChip active={filters.videoOnly} onClick={() => setFilters({ videoOnly: !filters.videoOnly })}>
          {t.videoOnly}
        </SmChip>
        <SmChip active={filters.sort === "new"} onClick={() => setFilters({ sort: "new" })}>
          {t.newestShort}
        </SmChip>
        <SmChip active={filters.sort === "price-asc"} onClick={() => setFilters({ sort: "price-asc" })}>
          {t.priceAsc}
        </SmChip>
        <SmChip active={filters.sort === "price-desc"} onClick={() => setFilters({ sort: "price-desc" })}>
          {t.priceDesc}
        </SmChip>
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

      {section === "shops" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {SHOP_CATEGORIES.map((id) => (
            <SmChip
              key={id}
              active={filters.category === id || shopParent === id}
              onClick={() => setFilters(applySellerShopCategory(filters.category === id ? null : id))}
            >
              {t.shopCats[id]}
            </SmChip>
          ))}
        </div>
      ) : null}
      {section === "shops" && shopKinds.length ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {shopKinds.map((id) => (
            <SmChip key={id} active={filters.category === id} onClick={() => setFilters({ section: "shops", category: id })}>
              {t.shopKinds[id]}
            </SmChip>
          ))}
        </div>
      ) : null}

      {section === "restaurants" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {RESTAURANT_CATEGORIES.map((id) => (
            <SmChip
              key={id}
              active={filters.category === id}
              onClick={() => setFilters({ category: filters.category === id ? null : id })}
            >
              {t.cats[id]}
            </SmChip>
          ))}
        </div>
      ) : null}

      {section === "rent" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {REALTY_GROUPS.map((id) => (
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
          ))}
        </div>
      ) : null}

      {section === "cars" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
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
        </div>
      ) : null}

      {section === "vacancies" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {JOB_SPHERES.map((id) => (
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
          ))}
        </div>
      ) : null}

      {section === "services" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {SERVICE_CATEGORIES.map((id) => (
            <SmChip
              key={id}
              active={filters.category === id}
              onClick={() => setFilters({ category: filters.category === id ? null : id })}
            >
              {t.cats[id]}
            </SmChip>
          ))}
        </div>
      ) : null}

      {section === "secondhand" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORIES.map((id) => (
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
          ))}
        </div>
      ) : null}
      {section === "secondhand" && goodsKinds.length ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {goodsKinds.map((id) => (
            <SmChip
              key={id}
              active={filters.goodsKind === id}
              onClick={() => setFilters({ goodsKind: filters.goodsKind === id ? "any" : id })}
            >
              {t.goodsKinds[id]}
            </SmChip>
          ))}
        </div>
      ) : null}

      {section === "animals" ? (
        <div className="sc mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
          {ANIMAL_GROUPS.map((id) => (
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
              {id === "pets" ? t.animalPets : t.animalFarm}
            </SmChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
