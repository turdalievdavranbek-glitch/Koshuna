"use client";

import { vehicleMakesOf, vehicleModelsOf, vehicleTypesOf } from "@/lib/transport";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function CarMakeChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const group = filters.vehicleGroup === "any" ? undefined : filters.vehicleGroup;
  const type = filters.bodyType === "any" ? undefined : filters.bodyType;
  const makes = vehicleMakesOf(group, type);
  const models = vehicleModelsOf(filters.carMake, group, type);

  const pickGroup = (id: "any" | "passenger" | "special") => {
    setFilters({ vehicleGroup: id, bodyType: "any", carMake: "any", carModel: "any" });
  };
  const pickType = (id: string) => {
    setFilters({ bodyType: id, carMake: "any", carModel: "any" });
  };
  const pickMake = (id: string) => {
    setFilters({ carMake: id, carModel: "any" });
  };

  const types = vehicleTypesOf(filters.vehicleGroup);

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        <SectionList
          title={t.category}
          rows={[
            { id: "any", label: t.allCategories, active: filters.vehicleGroup === "any", onClick: () => pickGroup("any") },
            { id: "passenger", label: t.vehicleGroups.passenger, active: filters.vehicleGroup === "passenger", onClick: () => pickGroup("passenger") },
            { id: "special", label: t.vehicleGroups.special, active: filters.vehicleGroup === "special", onClick: () => pickGroup("special") },
          ]}
        />
        {types.length ? (
          <SectionList
            title={filters.vehicleGroup === "special" ? t.vehicleType : t.bodyType}
            rows={[
              { id: "any", label: t.any, active: filters.bodyType === "any", onClick: () => pickType("any") },
              ...types.map((id) => ({
                id,
                label: t.vehicleTypes[id],
                active: filters.bodyType === id,
                onClick: () => pickType(id),
              })),
            ]}
          />
        ) : null}
        <SectionList
          title={t.carMake}
          rows={[
            { id: "any", label: t.any, active: filters.carMake === "any", onClick: () => pickMake("any") },
            ...makes.map((id) => ({
              id,
              label: t.carMakes[id] ?? id,
              active: filters.carMake === id,
              onClick: () => pickMake(id),
            })),
          ]}
        />
        {models.length ? (
          <SectionList
            title={t.carModel}
            rows={[
              { id: "any", label: t.any, active: filters.carModel === "any", onClick: () => setFilters({ carModel: "any" }) },
              ...models.map((id) => ({
                id,
                label: t.carModels[id] ?? id,
                active: filters.carModel === id,
                onClick: () => setFilters({ carModel: id }),
              })),
            ]}
          />
        ) : null}
      </div>
    );
  }

  const groupRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={filters.vehicleGroup === "any"} onClick={() => pickGroup("any")}>
        {t.allCategories}
      </Chip>
      <Chip active={filters.vehicleGroup === "passenger"} onClick={() => pickGroup("passenger")}>
        {t.vehicleGroups.passenger}
      </Chip>
      <Chip active={filters.vehicleGroup === "special"} onClick={() => pickGroup("special")}>
        {t.vehicleGroups.special}
      </Chip>
    </div>
  );

  const typeRow =
    types.length > 0 ? (
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        <Chip active={filters.bodyType === "any"} onClick={() => pickType("any")}>
          {t.any}
        </Chip>
        {types.map((id) => (
          <Chip key={id} active={filters.bodyType === id} onClick={() => pickType(id)}>
            {t.vehicleTypes[id]}
          </Chip>
        ))}
      </div>
    ) : null;

  const makeRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={filters.carMake === "any"} onClick={() => pickMake("any")}>
        {t.any}
      </Chip>
      {makes.map((id) => (
        <Chip key={id} active={filters.carMake === id} onClick={() => pickMake(id)}>
          {t.carMakes[id] ?? id}
        </Chip>
      ))}
    </div>
  );

  const modelRow =
    models.length > 0 ? (
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        <Chip active={filters.carModel === "any"} onClick={() => setFilters({ carModel: "any" })}>
          {t.any}
        </Chip>
        {models.map((id) => (
          <Chip key={id} active={filters.carModel === id} onClick={() => setFilters({ carModel: id })}>
            {t.carModels[id] ?? id}
          </Chip>
        ))}
      </div>
    ) : null;

  if (labeled) {
    return (
      <>
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          {groupRow}
        </div>
        {typeRow ? (
          <div>
            <Eyebrow>{filters.vehicleGroup === "special" ? t.vehicleType : t.bodyType}</Eyebrow>
            {typeRow}
          </div>
        ) : null}
        <div>
          <Eyebrow>{t.carMake}</Eyebrow>
          {makeRow}
        </div>
        {modelRow ? (
          <div>
            <Eyebrow>{t.carModel}</Eyebrow>
            {modelRow}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {groupRow}
      {typeRow}
      {makeRow}
      {modelRow}
    </div>
  );
}
