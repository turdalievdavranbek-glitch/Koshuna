"use client";

import { isFromNeighbor, neighborFlags, type NeighborFlag } from "@/lib/neighbor";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconCheck } from "./icons";

const ORDER: NeighborFlag[] = ["owner", "place", "som", "noPrepay"];

export function NeighborMark({ listing, compact }: { listing: Listing; compact?: boolean }) {
  const { t } = useApp();
  if (!isFromNeighbor(listing)) return null;
  return (
    <span
      className={`pointer-events-none font-bold tracking-wide text-success ${
        compact
          ? "rounded-full bg-[#E7F3ED] px-1.5 py-0.5 text-[8px]"
          : "rounded-full bg-[#E7F3ED] px-2 py-0.5 text-[10px]"
      }`}
    >
      {t.fromNeighbor}
    </span>
  );
}

export function NeighborBanner({
  active,
  onClick,
}: {
  active?: boolean;
  onClick?: () => void;
}) {
  const { t } = useApp();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[18px] border px-4 py-3.5 text-left"
      style={{
        background: active ? "#17140F" : "#FFFFFF",
        borderColor: active ? "#17140F" : "#E4DCCE",
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: active ? "#E8C4B8" : "#8E3423" }}
      >
        {t.fromNeighbor}
      </div>
      <div
        className="mt-1 font-display text-[17px] font-bold leading-[1.2] tracking-[-0.015em]"
        style={{ color: active ? "#F7F3EC" : "#17140F" }}
      >
        {t.neighborSlogan}
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.45]" style={{ color: active ? "rgba(247,243,236,.72)" : "#6E6558" }}>
        {t.neighborPitch}
      </p>
    </button>
  );
}

export function NeighborCard({ listing }: { listing: Listing }) {
  const { t } = useApp();
  const flags = neighborFlags(listing);
  const ok = isFromNeighbor(listing);
  const labels: Record<NeighborFlag, string> = {
    owner: t.neighborOwner,
    place: t.neighborPlace,
    som: t.neighborSom,
    noPrepay: t.neighborNoPrepay,
  };

  return (
    <div
      className="mt-5 rounded-[18px] border p-4"
      style={{
        background: ok ? "#E7F3ED" : "#FFFFFF",
        borderColor: ok ? "#C5DDD1" : "#E4DCCE",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-[17px] font-bold text-ink">{ok ? t.fromNeighbor : t.neighborMissing}</div>
        {ok ? <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-success">{t.neighborPass}</span> : null}
      </div>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{ok ? t.neighborCardOk : t.neighborCardNo}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {ORDER.map((id) => {
          const on = flags[id];
          return (
            <li key={id} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                style={{ background: on ? "#2A6B57" : "#E4DCCE" }}
              >
                <IconCheck size={11} color={on ? "#F7F3EC" : "#A79C8C"} />
              </span>
              <span className="text-[13px] leading-[1.4] text-ink" style={{ opacity: on ? 1 : 0.55 }}>
                {labels[id]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
