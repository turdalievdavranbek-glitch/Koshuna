"use client";

import { CONSTRUCTION_CATEGORIES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function ConstructionChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={!filters.category} onClick={() => setFilters({ category: null })}>
        {t.allCategories}
      </Chip>
      {CONSTRUCTION_CATEGORIES.map((c) => (
        <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
          {t.cats[c]}
        </Chip>
      ))}
    </div>
  );

  if (labeled) {
    return (
      <div>
        <Eyebrow>{t.category}</Eyebrow>
        {row}
      </div>
    );
  }

  return row;
}
