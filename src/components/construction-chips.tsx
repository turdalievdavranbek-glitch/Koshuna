"use client";

import { CONSTRUCTION_CATEGORIES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function ConstructionChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();

  if (list) {
    return (
      <SectionList
        title={t.category}
        rows={[
          { id: "all", label: t.allCategories, active: !filters.category, onClick: () => setFilters({ category: null }) },
          ...CONSTRUCTION_CATEGORIES.map((c) => ({
            id: c,
            label: t.cats[c],
            active: filters.category === c,
            onClick: () => setFilters({ category: c }),
          })),
        ]}
      />
    );
  }

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
