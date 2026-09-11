"use client";

import { DEAL_KINDS } from "@/lib/data";
import { realtyIsLiving, realtyShowsStock } from "@/lib/realty";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

const DEALS = [...DEAL_KINDS, "any"] as const;

function dealLabel(id: (typeof DEALS)[number], t: ReturnType<typeof useApp>["t"]) {
  if (id === "buy") return t.dealBuy;
  if (id === "short") return t.dealShort;
  if (id === "long") return t.dealLong;
  if (id === "share") return t.dealShare;
  return t.any;
}

export function DealTypeChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const living = realtyIsLiving(filters.realtyGroup, filters.housingType);

  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      {DEALS.map((id) => (
        <Chip
          key={id}
          active={filters.dealType === id}
          onClick={() =>
            setFilters({
              dealType: id,
              checkIn: id === "short" && living ? filters.checkIn : null,
              checkOut: id === "short" && living ? filters.checkOut : null,
              stockType: id === "buy" ? filters.stockType : "any",
            })
          }
        >
          {dealLabel(id, t)}
        </Chip>
      ))}
    </div>
  );

  const stock =
    filters.dealType === "buy" && realtyShowsStock(filters.realtyGroup, filters.realtySub, filters.housingType) ? (
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
