"use client";

import { CAR_MAKES, carModelsOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function CarMakeChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const models = carModelsOf(filters.carMake);

  const pickMake = (id: string) => {
    setFilters({ carMake: id, carModel: "any" });
  };

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        <SectionList
          title={t.carMake}
          rows={[
            { id: "any", label: t.any, active: filters.carMake === "any", onClick: () => pickMake("any") },
            ...CAR_MAKES.map((id) => ({
              id,
              label: t.carMakes[id],
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
                label: t.carModels[id],
                active: filters.carModel === id,
                onClick: () => setFilters({ carModel: id }),
              })),
            ]}
          />
        ) : null}
      </div>
    );
  }

  const makeRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={filters.carMake === "any"} onClick={() => pickMake("any")}>
        {t.any}
      </Chip>
      {CAR_MAKES.map((id) => (
        <Chip key={id} active={filters.carMake === id} onClick={() => pickMake(id)}>
          {t.carMakes[id]}
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
            {t.carModels[id]}
          </Chip>
        ))}
      </div>
    ) : null;

  if (labeled) {
    return (
      <>
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
      {makeRow}
      {modelRow}
    </div>
  );
}
