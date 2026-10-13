"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { effectiveScope, nearDecision, nearPatch } from "@/lib/filter";
import { locate, type LocateError } from "@/lib/locate";
import { clearPlace } from "@/lib/places";
import { useApp } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { GeoError } from "@/components/geo-error";
import { openLocationPicker } from "@/components/location-line";
import { Chip } from "@/components/ui";

export function ScopeChips() {
  const { t, filters, setFilters, setCity } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LocateError | null>(null);
  // «Мой район» and «Рядом» are one chip: GPS first, then the chosen place, then the whole country.
  const nearOn = filters.scope !== "all";
  const shown = effectiveScope(filters);
  const nearLat = filters.nearLat;
  const scope = filters.scope;

  // Permission already granted: refresh the position quietly (no prompt). Otherwise wait for a tap.
  useEffect(() => {
    if (scope !== "near" || nearLat != null) return;
    let dead = false;
    void (async () => {
      try {
        const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (dead || perm?.state !== "granted") return;
        const res = await locate();
        if (!dead && res.ok) setFilters(nearPatch(res));
      } catch {
        // No Permissions API: keep the district fallback.
      }
    })();
    return () => {
      dead = true;
    };
    // setFilters is new every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, nearLat]);

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
    if (res.ok) return setFilters(nearPatch(res));
    // No GPS: stay on «Рядом» and fall back to the chosen place (or the whole country with a hint).
    setFilters({ scope: "near" });
    if (res.error !== "denied" && res.error !== "unsupported" && res.error !== "insecure") setError(res.error);
  };
  return (
    <div>
      <div
        data-testid="scope-chips"
        className="flex flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Chip size="compact" testId="scope-near" active={nearOn} onClick={() => void pickNear()}>{busy ? t.locationGeoBusy : t.scopeNear}</Chip>
        <Chip size="compact" testId="scope-all" active={!nearOn} onClick={pickAll}>{t.scopeAll}</Chip>
      </div>
      {nearOn && shown === "all" && !busy ? (
        <p data-testid="scope-need-place" className="mt-2 text-[12px] leading-[1.4] text-muted">
          {t.scopeNeedPlace}{" "}
          <button type="button" className="font-semibold text-accent" onClick={() => openLocationPicker(router, path || "/")}>
            {t.scopePickPlace}
          </button>
        </p>
      ) : null}
      {error ? <div className="mt-2"><GeoError compact error={error} onRetry={() => void pickNear()} /></div> : null}
    </div>
  );
}

export function NearEmptyState() {
  const { t, setFilters, setCity } = useApp();
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
          <button type="button" onClick={pickAll} className="text-[13px] font-semibold text-accent">{t.scopeAll}</button>
        </>
      }
    />
  );
}
