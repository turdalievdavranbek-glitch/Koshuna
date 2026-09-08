"use client";

import { ANIMAL_GROUPS, animalKindsOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function AnimalChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const group = filters.animalGroup === "farm" ? "farm" : "pets";
  const kinds = animalKindsOf(group);

  const pickGroup = (id: "pets" | "farm") => {
    setFilters({ animalGroup: id, animalKind: "any" });
  };

  const groupRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
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
        <div>
          <Eyebrow>{t.animalKindLabel}</Eyebrow>
          {kindRow}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {groupRow}
      {kindRow}
    </div>
  );
}
