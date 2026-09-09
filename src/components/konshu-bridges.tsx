"use client";

import { useRouter } from "next/navigation";
import { isAbroad } from "@/lib/strategy";
import { useApp } from "@/lib/store";

export function KonshuBridges() {
  const { t, filters, setFilters, setElderMode, elderMode, setCity, viewerPlace } = useApp();
  const router = useRouter();
  const abroad = isAbroad(viewerPlace);

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgesTitle}</div>
        <button
          type="button"
          onClick={() => router.push("/strategy")}
          className="text-[11px] font-semibold text-accent"
        >
          {t.strategyNav}
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => router.push("/from-ig")}
          className="rounded-[16px] border border-line bg-surface px-2.5 py-3 text-left"
        >
          <div className="text-[15px] font-bold leading-[1.15] text-ink">{t.bridgeIg}</div>
          <p className="mt-1 text-[11px] leading-[1.3] text-muted">{t.bridgeIgHint}</p>
        </button>
        <button
          type="button"
          onClick={() => {
            if (filters.aiylOnly) {
              setFilters({ aiylOnly: false, settlement: "any" });
            } else {
              setCity("all");
              setFilters({ aiylOnly: true, settlement: "any", locLat: null, locLng: null, locLabel: null });
            }
          }}
          className="rounded-[16px] border px-2.5 py-3 text-left"
          style={{
            background: filters.aiylOnly ? "#17140F" : "#FFFFFF",
            borderColor: filters.aiylOnly ? "#17140F" : "#E4DCCE",
          }}
        >
          <div className="text-[15px] font-bold leading-[1.15]" style={{ color: filters.aiylOnly ? "#F7F3EC" : "#17140F" }}>
            {t.bridgeAiyl}
          </div>
          <p className="mt-1 text-[11px] leading-[1.3]" style={{ color: filters.aiylOnly ? "rgba(247,243,236,.7)" : "#6E6558" }}>
            {t.bridgeAiylHint}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setElderMode(!elderMode)}
          className="rounded-[16px] border px-2.5 py-3 text-left"
          style={{
            background: elderMode ? "#17140F" : "#FFFFFF",
            borderColor: elderMode ? "#17140F" : "#E4DCCE",
          }}
        >
          <div className="text-[15px] font-bold leading-[1.15]" style={{ color: elderMode ? "#F7F3EC" : "#17140F" }}>
            {t.bridgeApa}
          </div>
          <p className="mt-1 text-[11px] leading-[1.3]" style={{ color: elderMode ? "rgba(247,243,236,.7)" : "#6E6558" }}>
            {t.bridgeApaHint}
          </p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/strategy")}
          className="rounded-[16px] border px-2.5 py-3 text-left"
          style={{
            background: abroad ? "#17140F" : "#FFFFFF",
            borderColor: abroad ? "#17140F" : "#E4DCCE",
          }}
        >
          <div className="text-[15px] font-bold leading-[1.15]" style={{ color: abroad ? "#F7F3EC" : "#17140F" }}>
            {t.bridgeAbroad}
          </div>
          <p className="mt-1 text-[11px] leading-[1.3]" style={{ color: abroad ? "rgba(247,243,236,.7)" : "#6E6558" }}>
            {abroad ? t.viewerPlaces[viewerPlace] : t.bridgeAbroadHint}
          </p>
        </button>
      </div>
    </div>
  );
}

export function AbroadBanner() {
  const { t, viewerPlace } = useApp();
  const router = useRouter();
  if (!isAbroad(viewerPlace)) return null;
  return (
    <button
      type="button"
      onClick={() => router.push("/strategy")}
      className="mt-3 w-full rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">
        {t.viewerWhere}: {t.viewerPlaces[viewerPlace]}
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.abroadBannerBody}</p>
      <span className="mt-2 inline-block text-[12px] font-semibold text-accent">{t.strategyNav} ›</span>
    </button>
  );
}
