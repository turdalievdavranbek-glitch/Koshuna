"use client";

import { propertyIsLiving, propertyShowsStock } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

const DEALS = ["buy", "short", "long", "any"] as const;

export function DealTypeChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      {DEALS.map((id) => (
        <Chip
          key={id}
          active={filters.dealType === id}
          onClick={() =>
            setFilters({
              dealType: id,
              checkIn: id === "short" && propertyIsLiving(filters.housingType) ? filters.checkIn : null,
              checkOut: id === "short" && propertyIsLiving(filters.housingType) ? filters.checkOut : null,
              stockType: id === "buy" ? filters.stockType : "any",
            })
          }
        >
          {id === "buy" ? t.dealBuy : id === "short" ? t.dealShort : id === "long" ? t.dealLong : t.any}
        </Chip>
      ))}
    </div>
  );

  const stock =
    filters.dealType === "buy" && propertyShowsStock(filters.housingType) ? (
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(
          [
            ["any", t.any],
            ["newbuild", t.stockNew],
            ["resale", t.stockResale],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} active={filters.stockType === id} onClick={() => setFilters({ stockType: id })}>
            {label}
          </Chip>
        ))}
      </div>
    ) : null;

  if (labeled) {
    return (
      <div>
        <Eyebrow>{t.dealType}</Eyebrow>
        {row}
        {stock}
      </div>
    );
  }

  return (
    <>
      {row}
      {stock}
    </>
  );
}
