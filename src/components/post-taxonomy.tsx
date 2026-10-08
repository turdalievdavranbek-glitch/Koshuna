"use client";

import { useEffect, useState } from "react";
import {
  ANIMAL_GROUPS,
  animalKindsOf,
  CATEGORIES,
  CONSTRUCTION_CATEGORIES,
  DEAL_KINDS,
  draftAfterServiceTap,
  goodsKindsOf,
  isServiceGroup,
  PRIVATE_POST_SHOP_CATEGORIES,
  isTechCategory,
  RESTAURANT_CATEGORIES,
  SERVICE_CATEGORIES,
  SERVICE_GROUPS,
  SERVICE_TOP,
  serviceLeafReady,
  techBrandsOf,
  techModelsOf,
} from "@/lib/data";
import { MENU_CATEGORIES } from "@/lib/types";
import { makeListView, VEHICLE_GROUPS, vehicleMakesOf, vehicleModelsOf, vehicleTypesOf } from "@/lib/transport";
import { JOB_SPHERES, JOB_TYPES, jobRolesOf, jobSubsOf } from "@/lib/vacancies";
import { REALTY_GROUPS, housingKindOfRealty, realtyKindsOf, realtySubsOf, roomsOfRealtyKind } from "@/lib/realty";
import { useApp } from "@/lib/store";
import { applySellerShopCategory } from "@/components/shop-chips";
import type { DraftListing, SectionId } from "@/lib/types";
import { SectionList } from "@/components/section-list";
import { Chip } from "@/components/ui";

type Props = {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
  onTaxonomyReady?: (ready: boolean) => void;
};

export function pickSection(draft: DraftListing, id: SectionId): Partial<DraftListing> {
  const kind = id === "rent" || id === "stays" ? "rent" : "goods";
  const next: Partial<DraftListing> = { section: id, kind, aiConfirmed: false };
  if (id === "rent") {
    next.housingKind = draft.housingKind ?? "apartment";
    next.realtyGroup = draft.realtyGroup ?? "apartments";
    next.dealKind = draft.dealKind ?? "long";
  }
  if (id === "secondhand") {
    const keep = draft.category && (CATEGORIES as readonly string[]).includes(draft.category);
    next.category = keep ? draft.category : "phones";
  }
  if (id === "animals") next.animalGroup = draft.animalGroup ?? "farm";
  if (id === "services") {
    const keep = draft.category && (SERVICE_CATEGORIES as readonly string[]).includes(draft.category);
    next.category = keep ? draft.category : SERVICE_CATEGORIES[0];
  }
  if (id === "construction") next.category = draft.category ?? CONSTRUCTION_CATEGORIES[0];
  if (id === "restaurants") next.category = draft.category ?? RESTAURANT_CATEGORIES[0];
  if (id === "vacancies") next.jobType = draft.jobType ?? "full";
  if (id === "shops") {
    const category = draft.category;
    const medicines = category === "health" || (category?.startsWith("health-") ?? false);
    next.category = !medicines && category ? category : "food";
  }
  return next;
}

export function PostTaxonomy({ draft, onPatch, onTaxonomyReady }: Props) {
  const { t, setFilters } = useApp();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [makesOpen, setMakesOpen] = useState(false);
  const makeIds = vehicleMakesOf(draft.vehicleGroup ?? "passenger", draft.vehicleType);
  const makeView = makeListView(makeIds, {
    expanded: makesOpen,
    selected: draft.carMake,
    labelOf: (id) => t.carMakes[id] ?? id,
  });

  useEffect(() => {
    setOpenGroup(null);
  }, [draft.section]);

  useEffect(() => {
    setMakesOpen(false);
  }, [draft.vehicleGroup, draft.vehicleType]);

  useEffect(() => {
    onTaxonomyReady?.(draft.section === "services" ? serviceLeafReady(draft.category, openGroup) : true);
  }, [draft.section, draft.category, openGroup, onTaxonomyReady]);

  return (
    <div className="mt-2.5 flex flex-col gap-3">
      {(draft.section === "cars" || draft.section === "car-rental") ? (
        <>
          <SectionList
            title={t.dealType}
            rows={[
              { id: "sale", label: t.autoSale, active: draft.section === "cars", onClick: () => onPatch({ section: "cars" }) },
              { id: "rent", label: t.autoRent, active: draft.section === "car-rental", onClick: () => onPatch({ section: "car-rental" }) },
            ]}
          />
          <SectionList
            title={t.category}
            rows={VEHICLE_GROUPS.map((id) => ({
              id,
              label: t.vehicleGroups[id],
              active: (draft.vehicleGroup ?? "passenger") === id,
              onClick: () => onPatch({ vehicleGroup: id, vehicleType: undefined, carMake: undefined, carModel: undefined }),
            }))}
          />
          <SectionList
            title={draft.vehicleGroup === "special" ? t.vehicleType : t.bodyType}
            rows={vehicleTypesOf(draft.vehicleGroup ?? "passenger").map((id) => ({
              id,
              label: t.vehicleTypes[id],
              active: draft.vehicleType === id,
              onClick: () => onPatch({ vehicleType: id, carMake: undefined, carModel: undefined }),
            }))}
          />
          <SectionList
            title={t.carMake}
            rows={[
              ...makeView.ids.map((id) => ({
                id,
                label: t.carMakes[id] ?? id,
                active: draft.carMake === id,
                onClick: () => onPatch({ carMake: id, carModel: undefined }),
              })),
              ...(makeView.showAll
                ? [{ id: "all-makes", label: t.allMakes(makeView.total), active: false, onClick: () => setMakesOpen(true) }]
                : []),
            ]}
          />
          {vehicleModelsOf(draft.carMake, draft.vehicleGroup ?? "passenger", draft.vehicleType).length ? (
            <SectionList
              title={t.carModel}
              rows={vehicleModelsOf(draft.carMake, draft.vehicleGroup ?? "passenger", draft.vehicleType).map((id) => ({
                id,
                label: t.carModels[id] ?? id,
                active: draft.carModel === id,
                onClick: () => onPatch({ carModel: id }),
              }))}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Chip active={draft.gearKind === "auto"} onClick={() => onPatch({ gearKind: "auto" })}>
              {t.auto}
            </Chip>
            <Chip active={draft.gearKind === "manual"} onClick={() => onPatch({ gearKind: "manual" })}>
              {t.manual}
            </Chip>
          </div>
        </>
      ) : null}

      {draft.section === "vacancies" ? (
        <>
          <SectionList
            title={t.jobTypes.full ? t.category : t.category}
            rows={JOB_TYPES.map((id) => ({
              id,
              label: t.jobTypes[id],
              active: (draft.jobType ?? "full") === id,
              onClick: () => onPatch({ jobType: id }),
            }))}
          />
          <SectionList
            title={t.category}
            rows={JOB_SPHERES.map((id) => ({
              id,
              label: t.jobSpheres[id],
              active: draft.jobSphere === id,
              onClick: () => onPatch({ jobSphere: id, jobSub: undefined, jobRole: undefined }),
            }))}
          />
          {draft.jobSphere ? (
            <SectionList
              title={t.category}
              rows={jobSubsOf(draft.jobSphere).map((id) => ({
                id,
                label: t.jobSubs[id] ?? id,
                active: draft.jobSub === id,
                onClick: () => onPatch({ jobSub: id, jobRole: undefined }),
              }))}
            />
          ) : null}
          {draft.jobSphere && draft.jobSub ? (
            <SectionList
              title={t.category}
              rows={jobRolesOf(draft.jobSphere, draft.jobSub).map((id) => ({
                id,
                label: t.jobRoles[id] ?? id,
                active: draft.jobRole === id,
                onClick: () => onPatch({ jobRole: id }),
              }))}
            />
          ) : null}
        </>
      ) : null}

      {draft.section === "rent" ? (
        <>
          <SectionList
            title={t.dealType}
            rows={DEAL_KINDS.map((id) => ({
              id,
              label: id === "buy" ? t.dealBuy : id === "short" ? t.dealShort : id === "long" ? t.dealLong : t.dealShare,
              active: (draft.dealKind ?? "long") === id,
              onClick: () => onPatch({ dealKind: id }),
            }))}
          />
          <SectionList
            title={t.category}
            rows={REALTY_GROUPS.map((id) => ({
              id,
              label: t.realtyGroups[id],
              active: draft.realtyGroup === id,
              onClick: () =>
                onPatch({
                  realtyGroup: id,
                  realtySub: undefined,
                  realtyKind: undefined,
                  housingKind: housingKindOfRealty(id) === "any" ? "apartment" : (housingKindOfRealty(id) as DraftListing["housingKind"]),
                }),
            }))}
          />
          {draft.realtyGroup ? (
            <SectionList
              title={t.category}
              rows={realtySubsOf(draft.realtyGroup).map((id) => ({
                id,
                label: t.realtySubs[id] ?? id,
                active: draft.realtySub === id,
                onClick: () => onPatch({ realtySub: id, realtyKind: undefined }),
              }))}
            />
          ) : null}
          {draft.realtyGroup && draft.realtySub ? (
            <SectionList
              title={t.category}
              rows={realtyKindsOf(draft.realtyGroup, draft.realtySub).map((id) => ({
                id,
                label: t.realtyKinds[id] ?? id,
                active: draft.realtyKind === id,
                onClick: () => {
                  const rooms = roomsOfRealtyKind(id);
                  onPatch({
                    realtyKind: id,
                    housingKind:
                      housingKindOfRealty(draft.realtyGroup, id) === "any"
                        ? draft.housingKind
                        : (housingKindOfRealty(draft.realtyGroup, id) as DraftListing["housingKind"]),
                    rooms: rooms.length ? String(rooms[0]) : draft.rooms,
                  });
                },
              }))}
            />
          ) : null}
        </>
      ) : null}

      {draft.section === "secondhand" ? (
        <>
          <SectionList
            title={t.category}
            rows={CATEGORIES.map((c) => ({
              id: c,
              label: t.cats[c],
              active: draft.category === c,
              onClick: () => onPatch({ category: c, goodsKind: undefined, techBrand: undefined, techModel: undefined }),
            }))}
          />
          {goodsKindsOf(draft.category).length ? (
            <SectionList
              title={t.category}
              rows={goodsKindsOf(draft.category).map((id) => ({
                id,
                label: t.goodsKinds[id],
                active: draft.goodsKind === id,
                onClick: () => onPatch({ goodsKind: id }),
              }))}
            />
          ) : null}
          {isTechCategory(draft.category) ? (
            <SectionList
              title={t.category}
              rows={techBrandsOf(draft.category).map((id) => ({
                id,
                label: t.techBrands[id],
                active: draft.techBrand === id,
                onClick: () => onPatch({ techBrand: id, techModel: undefined }),
              }))}
            />
          ) : null}
          {techModelsOf(draft.category, draft.techBrand).length ? (
            <SectionList
              title={t.category}
              rows={techModelsOf(draft.category, draft.techBrand).map((id) => ({
                id,
                label: t.techModels[id],
                active: draft.techModel === id,
                onClick: () => onPatch({ techModel: id }),
              }))}
            />
          ) : null}
        </>
      ) : null}

      {draft.section === "animals" ? (
        <>
          <SectionList
            title={t.category}
            rows={ANIMAL_GROUPS.map((id) => ({
              id,
              label: t.animalGroups[id] ?? id,
              active: (draft.animalGroup ?? "farm") === id,
              onClick: () => onPatch({ animalGroup: id, animalKind: undefined }),
            }))}
          />
          <SectionList
            title={t.category}
            rows={animalKindsOf(draft.animalGroup ?? "farm").map((id) => ({
              id,
              label: t.animalKinds[id],
              active: draft.animalKind === id,
              onClick: () => onPatch({ animalKind: id }),
            }))}
          />
        </>
      ) : null}

      {draft.section === "services" ? (
        <>
          <SectionList
            title={t.category}
            rows={SERVICE_TOP.map((id) => ({
              id,
              label: t.cats[id] ?? id,
              active: isServiceGroup(id) ? openGroup === id : draft.category === id && !openGroup,
              onClick: () => {
                if (isServiceGroup(id)) {
                  setOpenGroup(id);
                  onTaxonomyReady?.(serviceLeafReady(draft.category, id));
                  return;
                }
                setOpenGroup(null);
                const next = draftAfterServiceTap(draft, id);
                onPatch(next);
                onTaxonomyReady?.(serviceLeafReady(next.category, null));
              },
            }))}
          />
          {openGroup && isServiceGroup(openGroup) ? (
            <SectionList
              title={t.cats[openGroup] ?? openGroup}
              rows={SERVICE_GROUPS[openGroup].map((id) => ({
                id,
                label: t.cats[id] ?? id,
                active: draft.category === id,
                onClick: () => {
                  onPatch({ category: id });
                  onTaxonomyReady?.(true);
                },
              }))}
            />
          ) : null}
        </>
      ) : null}

      {draft.section === "construction" ? (
        <SectionList
          title={t.category}
          rows={CONSTRUCTION_CATEGORIES.map((c) => ({
            id: c,
            label: t.cats[c],
            active: draft.category === c,
            onClick: () => onPatch({ category: c }),
          }))}
        />
      ) : null}

      {draft.section === "shops" ? (
        <SectionList
          title={t.category}
          rows={PRIVATE_POST_SHOP_CATEGORIES.map((c) => ({
            id: c,
            label: t.shopCats[c],
            active: draft.category === c,
            onClick: () => {
              onPatch({ category: c });
              setFilters(applySellerShopCategory(c));
            },
          }))}
        />
      ) : null}

      {draft.section === "restaurants" ? (
        <>
          <SectionList
            title={t.cuisineType}
            rows={RESTAURANT_CATEGORIES.map((c) => ({
              id: c,
              label: t.cats[c],
              active: draft.category === c,
              onClick: () => onPatch({ category: c }),
            }))}
          />
          <SectionList
            title={t.foodType}
            rows={MENU_CATEGORIES.map((c) => ({
              id: c,
              label: t.menuCats[c],
              active: draft.foodType === c,
              onClick: () => onPatch({ foodType: c }),
            }))}
          />
        </>
      ) : null}
    </div>
  );
}
