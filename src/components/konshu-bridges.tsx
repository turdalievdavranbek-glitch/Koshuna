"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export function KonshuBridges() {
  const { t, filters, setFilters, setElderMode, elderMode, setCity } = useApp();
  const router = useRouter();

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgesTitle}</div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => router.push("/from-ig")}
          className="rounded-[16px] border border-line bg-surface px-2 py-3 text-center"
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
          className="rounded-[16px] border px-2 py-3 text-center"
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
          className="rounded-[16px] border px-2 py-3 text-center"
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
      </div>
    </div>
  );
}
