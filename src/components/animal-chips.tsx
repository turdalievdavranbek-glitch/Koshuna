"use client";

import { ANIMAL_GROUPS, animalKindsOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function AnimalChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const group = filters.animalGroup === "farm" || filters.animalGroup === "pets" ? filters.animalGroup : "any";
  const kinds = animalKindsOf(group);

  const pickGroup = (id: "pets" | "farm") => {
    setFilters({ animalGroup: id, animalKind: "any" });
  };

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        <SectionList
          title={t.category}
          rows={[
            { id: "any", label: t.allCategories, active: group === "any", onClick: () => setFilters({ animalGroup: "any", animalKind: "any" }) },
            ...ANIMAL_GROUPS.map((id) => ({
              id,
              label: id === "pets" ? t.animalPets : t.animalFarm,
              active: group === id,
              onClick: () => pickGroup(id),
            })),
          ]}
        />
        {group === "any" ? null : (
          <SectionList
            title={t.animalKindLabel}
            rows={[
              { id: "any", label: t.any, active: filters.animalKind === "any", onClick: () => setFilters({ animalKind: "any" }) },
              ...kinds.map((id) => ({
                id,
                label: t.animalKinds[id],
                active: filters.animalKind === id,
                onClick: () => setFilters({ animalKind: id }),
              })),
            ]}
          />
        )}
      </div>
    );
  }

  const groupRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={group === "any"} onClick={() => setFilters({ animalGroup: "any", animalKind: "any" })}>
        {t.allCategories}
      </Chip>
      {ANIMAL_GROUPS.map((id) => (
        <Chip key={id} active={group === id} onClick={() => pickGroup(id)}>
          {id === "pets" ? t.animalPets : t.animalFarm}
        </Chip>
      ))}
    </div>
  );

  const kindRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={filters.animalKind === "any"} onClick={() => setFilters({ animalKind: "any" })}>
        {t.any}
      </Chip>
      {kinds.map((id) => (
        <Chip key={id} active={filters.animalKind === id} onClick={() => setFilters({ animalKind: id })}>
          {t.animalKinds[id]}
        </Chip>
      ))}
    </div>
  );

  if (labeled) {
    return (
      <>
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          {groupRow}
        </div>
        {group === "any" ? null : (
          <div>
            <Eyebrow>{t.animalKindLabel}</Eyebrow>
            {kindRow}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {groupRow}
      {group === "any" ? null : kindRow}
    </div>
  );
}
