"use client";

import { formatSom } from "@/lib/data";
import { listingsForMarket, marketBand, marketFit, marketMarker, parseDraftPrice } from "@/lib/market";
import { useApp } from "@/lib/store";
import type { DraftListing } from "@/lib/types";
import { Chip } from "./ui";

export function MarketRangeCard({
  draft,
  onPatch,
}: {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
}) {
  const { t, allListings, extraListings } = useApp();
  const band = marketBand(draft, listingsForMarket(allListings, extraListings));

  if (!band) {
    return (
      <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.marketTitle}</div>
        <p className="mt-2 text-[15px] leading-[1.45] text-ink">{t.marketMissing}</p>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.marketMissingHint}</p>
      </div>
    );
  }

  const price = parseDraftPrice(draft.price);
  const fit = marketFit(price, band);
  const marker = marketMarker(price, band);
  const unit = draft.kind === "rent" ? ` ${t.perMonthShort}` : "";
  const fitText = fit === "low" ? t.marketFitLow : fit === "high" ? t.marketFitHigh : t.marketFitIn;
  const scopeText = band.scope === "tight" ? t.marketScopeTight : band.scope === "city" ? t.marketScopeCity : t.marketScopeSection;

  const picks = [
    { id: "low", n: band.min, label: t.marketLow },
    { id: "mid", n: band.typical, label: t.marketTypical },
    { id: "high", n: band.max, label: t.marketHigh },
  ].filter((row, i, all) => all.findIndex((other) => other.n === row.n) === i);

  return (
    <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.marketTitle}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.marketHint}</p>
      <div className="mt-3 font-display text-[22px] font-bold leading-[1.15] text-ink">
        {formatSom(band.min)} – {formatSom(band.max)}
        <span className="ml-1 text-[13px] font-semibold text-muted">KGS{unit}</span>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        {t.marketCount(band.count)} · {scopeText}
      </p>
      <div className="relative mt-4 h-2 rounded-full bg-chip">
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white"
          style={{
            left: `${marker}%`,
            background: fit === "in" ? "#2A6B57" : "#B8452F",
            boxShadow: "0 2px 6px rgba(23,20,15,.2)",
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted">
        <span>{formatSom(band.min)}</span>
        <span>{t.marketYours}</span>
        <span>{formatSom(band.max)}</span>
      </div>
      <p
        className="mt-3 text-[13px] leading-[1.45]"
        style={{ color: fit === "in" ? "#245046" : "#8E3423" }}
      >
        {fitText}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {picks.map((row) => (
          <Chip key={row.id} active={price === row.n} accent={price === row.n} onClick={() => onPatch({ price: String(row.n) })}>
            {row.label} {formatSom(row.n)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
