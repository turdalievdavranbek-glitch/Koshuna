"use client";

import { PROPERTY_TYPES, propertyIsLiving, propertyShowsRooms } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function PropertyTypeChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();

  const pick = (id: string) => {
    setFilters({
      housingType: id,
      rooms: propertyShowsRooms(id) ? filters.rooms : [],
      checkIn: propertyIsLiving(id) && filters.dealType === "short" ? filters.checkIn : null,
      checkOut: propertyIsLiving(id) && filters.dealType === "short" ? filters.checkOut : null,
    });
  };

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={filters.housingType === "any"} onClick={() => pick("any")}>
        {t.allCategories}
      </Chip>
      {PROPERTY_TYPES.map((id) => (
        <Chip key={id} active={filters.housingType === id} onClick={() => pick(id)}>
          {t.propertyTypes[id]}
        </Chip>
      ))}
    </div>
  );

  if (labeled) {
    return (
      <div>
        <Eyebrow>{t.housingType}</Eyebrow>
        {row}
      </div>
    );
  }

  return row;
}
