"use client";

import { useState } from "react";
import { homeTiles } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import { SelectRow } from "@/components/ui";
import { IconCheck } from "@/components/icons";

export function sectionLabel(id: SectionId, t: ReturnType<typeof useApp>["t"]) {
  if (id === "shops") return t.shopNav;
  if (id === "car-rental") return t.sectionNames.cars;
  return t.sectionNames[id];
}

export function PostTypePicker({
  value,
  onPick,
}: {
  value: SectionId;
  onPick: (id: SectionId) => void;
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const tiles = homeTiles();
  const visual = value === "car-rental" ? "cars" : value;

  return (
    <div>
      <SelectRow label={t.listingType} value={sectionLabel(visual, t)} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <div className="mt-2 overflow-hidden rounded-[16px] border border-line bg-white">
          {tiles.map((s, i) => {
            const on = visual === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onPick(s.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-[10px] text-left ${i ? "border-t border-line" : ""}`}
                style={{ background: on ? "#17140F" : "#FFFFFF" }}
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#eee8dc]">
                  <img src={s.art} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="flex-1 text-[15px] font-semibold" style={{ color: on ? "#F7F3EC" : "#17140F" }}>
                  {s.id === "shops" ? t.shopNav : t.sectionNames[s.id]}
                </span>
                {on ? <IconCheck size={16} color="#F7F3EC" /> : <span className="text-muted-2">›</span>}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
