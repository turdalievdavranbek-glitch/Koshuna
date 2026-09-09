"use client";

import { RESTAURANT_CATEGORIES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function RestaurantChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={!filters.category} onClick={() => setFilters({ category: null })}>
        {t.allCategories}
      </Chip>
      {RESTAURANT_CATEGORIES.map((c) => (
        <Chip key={c} active={filters.category === c} onClick={() => setFilters({ category: c })}>
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
