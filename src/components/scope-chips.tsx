"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasPlaceFilter, nearDecision, nearPatch } from "@/lib/filter";
import { locate, type LocateError } from "@/lib/locate";
import { clearPlace, locationLineLabel } from "@/lib/places";
import { useApp } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { GeoError } from "@/components/geo-error";
import { openLocationPicker } from "@/components/location-line";
import { Chip } from "@/components/ui";

export function ScopeChips() {
  const { t, lang, city, filters, setFilters, setCity } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LocateError | null>(null);
  const place = hasPlaceFilter(filters);
  const areaLabel = place
    ? locationLineLabel(lang, city, filters, t.cities, t.oblasts, t.locationRefine, t.locationCountryHint)
    : t.scopeArea;
  const pickAll = () => {
    const next = clearPlace();
    setCity(next.city);
    setFilters({ ...next, scope: "all" });
    setError(null);
  };
  const pickNear = async () => {
    if (busy) return;
    setError(null);
    if (nearDecision(filters) === "keep") return;
    setBusy(true);
    const res = await locate();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setFilters(nearPatch(res));
  };
  return (
    <div>
      <div
        data-testid="scope-chips"
        className="flex flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Chip size="compact" active={filters.scope === "near"} onClick={() => void pickNear()}>{busy ? t.locationGeoBusy : t.scopeNear}</Chip>
        <Chip
          size="compact"
          truncate
          testId="scope-area"
          active={filters.scope === "area"}
          onClick={() => (place ? setFilters({ scope: "area" }) : openLocationPicker(router, path || "/"))}
        >
          {areaLabel}
        </Chip>
        <Chip size="compact" active={filters.scope === "all"} onClick={pickAll}>{t.scopeAll}</Chip>
      </div>
      {error ? <div className="mt-2"><GeoError compact error={error} onRetry={() => void pickNear()} /></div> : null}
    </div>
  );
}

export function NearEmptyState() {
  const { t, filters, setFilters, setCity } = useApp();
  const place = hasPlaceFilter(filters);
  const pickAll = () => {
    const next = clearPlace();
    setCity(next.city);
    setFilters({ ...next, scope: "all" });
  };
  return (
    <EmptyState
      variant="nothing"
      title={t.nearEmptyTitle}
      hint={t.nearEmptyHint}
      extra={
        <>
          {place ? <button type="button" onClick={() => setFilters({ scope: "area" })} className="h-11 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-accent-on">{t.scopeArea}</button> : null}
          <button type="button" onClick={pickAll} className="text-[13px] font-semibold text-accent">{t.scopeAll}</button>
        </>
      }
    />
  );
}
