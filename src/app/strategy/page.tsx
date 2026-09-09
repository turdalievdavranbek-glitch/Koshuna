"use client";

import { useRouter } from "next/navigation";
import { VIEWER_PLACES, isAbroad } from "@/lib/strategy";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip } from "@/components/ui";

const PILLARS = [
  ["strategyP1Title", "strategyP1Body"],
  ["strategyP2Title", "strategyP2Body"],
  ["strategyP3Title", "strategyP3Body"],
  ["strategyP4Title", "strategyP4Body"],
] as const;

export default function StrategyPage() {
  const { t, viewerPlace, setViewerPlace } = useApp();
  const router = useRouter();

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.strategyKicker}</div>
        <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink whitespace-pre-line">
          {t.strategyTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">{t.strategyLead}</p>

        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.strategyPick}</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {VIEWER_PLACES.map((id) => (
              <Chip key={id} active={viewerPlace === id} accent={id !== "kyrgyzstan" && viewerPlace === id} onClick={() => setViewerPlace(id)}>
                {t.viewerPlaces[id]}
              </Chip>
            ))}
          </div>
          {isAbroad(viewerPlace) ? <p className="mt-2 text-[12px] leading-[1.4] text-muted-2">{t.strategyFxNote}</p> : null}
        </div>

        <ol className="mt-5 flex flex-col gap-2.5">
          {PILLARS.map(([titleKey, bodyKey], i) => (
            <li key={titleKey} className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[13px] font-bold text-accent">{i + 1}</span>
                <span className="font-display text-[16px] font-bold text-ink">{t[titleKey]}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-muted">{t[bodyKey]}</p>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="shadow-btn mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.strategyCta}
        </button>
      </div>
    </PhoneShell>
  );
}
