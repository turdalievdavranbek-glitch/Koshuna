"use client";

import { RESTAURANT_CATEGORIES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function RestaurantChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();

  if (list) {
    return (
      <SectionList
        title={t.cuisine}
        rows={RESTAURANT_CATEGORIES.map((c) => ({
            id: c,
            label: t.cats[c],
            active: filters.category === c,
            onClick: () => setFilters({ category: filters.category === c ? null : c }),
          })),
      />
    );
  }

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      {RESTAURANT_CATEGORIES.map((c) => (
        <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: filters.category === c ? null : c })}>
          {t.cats[c]}
        </Chip>
      ))}
    </div>
  );

  if (labeled) {
    return (
      <div>
        <Eyebrow>{t.cuisine}</Eyebrow>
        {row}
      </div>
    );
  }

  return row;
}
